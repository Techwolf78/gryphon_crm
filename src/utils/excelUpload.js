import * as XLSX from 'xlsx';
import { db } from "../firebase";
import { doc, setDoc, collection, getDocs, query, orderBy } from "firebase/firestore";

// Smart batching utility to find the next available batch number and check existing batches
const getNextBatchInfo = async (chunkSize = 1000) => {
  try {
    // console.log("Checking existing batches in Firestore...");

    // Query all batch documents ordered by batch number (assuming batch_1, batch_2, etc.)
    const batchesQuery = query(collection(db, "companyleads"), orderBy("__name__"));
    const batchesSnapshot = await getDocs(batchesQuery);

    let highestBatchNumber = 0;
    let lastBatchData = null;
    let lastBatchId = null;

    batchesSnapshot.forEach((doc) => {
      const batchId = doc.id;
      // Extract batch number from batch_1, batch_2, etc.
      const match = batchId.match(/^batch_(\d+)$/);
      if (match) {
        const batchNum = parseInt(match[1]);
        if (batchNum > highestBatchNumber) {
          highestBatchNumber = batchNum;
          lastBatchId = batchId;
          lastBatchData = doc.data();
        }
      }
    });

    // console.log(`Found ${highestBatchNumber} existing batches. Last batch: ${lastBatchId}`);

    // Check if the last batch has space (<chunkSize records)
    let shouldCreateNewBatch = true;
    let nextBatchNumber = highestBatchNumber + 1;

    if (lastBatchData && lastBatchData.companies) {
      const lastBatchSize = lastBatchData.companies.length;
      // console.log(`Last batch (${lastBatchId}) has ${lastBatchSize} records`);

      if (lastBatchSize < chunkSize) {
        // Last batch has space, we can append to it
        shouldCreateNewBatch = false;
        nextBatchNumber = highestBatchNumber;
        // console.log(`Will append to existing batch_${nextBatchNumber} (${lastBatchSize}/${chunkSize} records)`);
      } else {
        // Last batch is full, create new batch
        // console.log(`Last batch is full (${lastBatchSize}/${chunkSize}), will create batch_${nextBatchNumber}`);
      }
    } else if (highestBatchNumber === 0) {
      // No existing batches, start from 1
      nextBatchNumber = 1;
      // console.log("No existing batches found, starting from batch_1");
    }

    return {
      nextBatchNumber,
      shouldCreateNewBatch,
      lastBatchData: shouldCreateNewBatch ? null : lastBatchData,
      lastBatchId: shouldCreateNewBatch ? null : lastBatchId
    };
  } catch (error) {
    // console.error("Error checking existing batches:", error);
    // If we can't check existing batches, start from batch_1
    // console.log("Could not check existing batches, starting from batch_1");
    return {
      nextBatchNumber: 1,
      shouldCreateNewBatch: true,
      lastBatchData: null,
      lastBatchId: null
    };
  }
};

// Utility function to handle Firestore index errors
const handleFirestoreIndexError = (error, operation = "operation") => {
  // console.error(`Firestore Index Error in ${operation}:`, error);

  if (error.message && error.message.includes('index')) {
    // console.error("Firestore Index Error Detected!");
    // console.error("To fix this, create the required index:");

    // Try to extract index URL from error message
    const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    if (indexUrlMatch) {
      console.log("Click here to create index", "color: blue; text-decoration: underline; cursor: pointer; font-weight: bold;", indexUrlMatch[0]);
      console.log("Or copy this URL: " + indexUrlMatch[0]);

      // Make the link clickable in some browsers
      console.log("After creating the index, refresh the page to retry the " + operation + ".");
    } else {
      console.error("Could not extract index URL from error.");
      console.log("Go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes");
      console.log("Replace YOUR_PROJECT_ID with your actual Firebase project ID");
    }
  }
};
// Requirements:
// 1. Read Excel file using xlsx library in browser/Node
// 2. Convert each row to company object with specific structure
// 3. Encode each company as Base64 JSON string using btoa(JSON.stringify(company))
// 4. Split into chunks of 1500 items per batch (under Firestore 1MB limit)
// 5. Upload each batch to Firestore collection 'companyleads' as documents: batch_1, batch_2, etc.
// 6. Each document contains { companies: [encodedCompany1, encodedCompany2, ...] }
// 7. Use setDoc(doc(db, "companies", batchId), { companies: chunk })
// 8. Add 500ms delay between batches to prevent overwhelming Firestore write stream
// 9. Log progress: "✅ Uploaded batch_1 (1500 records)"
// 10. Handle 58,000 records safely without exceeding Firestore limits
export const uploadCompaniesFromExcel = async (file, onProgress = null, assigneeId = null, targetBatchId = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        console.log("Reading Excel file...");

        // 1. Read the Excel file using xlsx library
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON, filter out empty rows
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log("Raw Excel data (first 3 rows):", rawJsonData.slice(0, 3));
        console.log("Available columns:", rawJsonData.length > 0 ? Object.keys(rawJsonData[0]) : "No data rows");

        const jsonData = rawJsonData.filter(row => {
          // Check for CompanyName with different possible variations
          const companyName = row['CompanyName'] || row['Company Name'] || row['companyName'] || row['company_name'];
          return companyName && companyName.toString().trim() !== '';
        });

        console.log(`Found ${jsonData.length} company records in Excel file`);

        // If no companies found, provide helpful error message
        if (jsonData.length === 0) {
          console.error("No valid company records found in Excel file!");
          console.error("Please ensure your Excel file has:");
          console.error("   - Column headers in the first row");
          console.error("   - 'CompanyName' or 'Company Name' column with company names");
          console.error("   - At least one row of data below the headers");
          throw new Error("No valid company records found. Please check your Excel file format and column names.");
        }

        // 2. Convert each row to company object
        const companies = jsonData.map(row => {
          const status = row['Status'] || row['status'] || 'cold';
          const currentTimestamp = new Date().toISOString();
          
          const company = {
            name: row['CompanyName'] || row['Company Name'] || row['companyName'] || row['company_name'] || '',
            contactPerson: row['ContactPerson'] || row['Contact Person'] || row['contactPerson'] || row['contact_person'] || '',
            designation: row['Designation'] || row['designation'] || '',
            phone: String(row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'] || ''),
            companyUrl: row['CompanyUrl'] || row['Company URL'] || row['Company Url'] || row['companyUrl'] || row['company_url'] || '',
            linkedinUrl: row['LinkedinUrl'] || row['LinkedIn URL'] || row['LinkedIn Url'] || row['linkedinUrl'] || row['linkedin_url'] || '',
            // Additional fields that may be in Excel
            email: row['Email'] || row['email'] || '',
            location: row['Location'] || row['location'] || '',
            industry: row['Industry'] || row['industry'] || '',
            companySize: row['CompanySize'] || row['Company Size'] || row['companySize'] || row['company_size'] || '',
            source: row['Source'] || row['source'] || 'Excel Upload',
            notes: row['Notes'] || row['notes'] || '',
            status: status.toLowerCase() || 'cold',
            contacts: [], // Initialize empty contacts array
          };

          // Add status-specific timestamp when company is created from Excel
          const statusLower = status.toLowerCase();
          if (statusLower === "hot") {
            company.hotAt = currentTimestamp;
          } else if (statusLower === "warm") {
            company.warmAt = currentTimestamp;
          } else if (statusLower === "cold") {
            company.coldAt = currentTimestamp;
          } else if (statusLower === "called") {
            company.calledAt = currentTimestamp;
          } else if (statusLower === "onboarded") {
            company.onboardedAt = currentTimestamp;
          }

          // If assigneeId is provided, assign the company to that user
          if (assigneeId) {
            company.assignedTo = assigneeId;
            company.assignedBy = assigneeId; // Assuming the uploader is assigning to themselves
            company.assignedAt = new Date().toISOString();
          }

          return company;
        });

        console.log("Converting companies to Base64 encoded JSON strings...");

        // 3. Encode each company object as Base64 JSON string (Unicode-safe)
        const encodedCompanies = companies.map(company => {
          // Use encodeURIComponent + btoa to handle Unicode characters
          const jsonString = JSON.stringify(company);
          const uriEncoded = encodeURIComponent(jsonString);
          return btoa(uriEncoded);
        });

        console.log(`Encoded ${encodedCompanies.length} companies as Base64 strings`);

        // 4. Handle batching logic
        const chunkSize = 500; // Batch size limit reduced to stay under 1MB document size
        let batchesToUpload = [];

        if (targetBatchId) {
          // User specified target batch
          console.log(`User specified target batch: ${targetBatchId}`);

          // Check if target batch exists
          const targetBatchSnap = await getDocs(query(collection(db, "companyleads"), orderBy("__name__")));
          let targetBatchData = null;
          targetBatchSnap.forEach(doc => {
            if (doc.id === targetBatchId) {
              targetBatchData = doc.data();
            }
          });

          if (targetBatchData) {
            // Append to existing batch
            const existingCompanies = targetBatchData.companies || [];
            const availableSpace = chunkSize - existingCompanies.length;

            console.log(`Appending to specified batch ${targetBatchId} (${existingCompanies.length}/${chunkSize} used, ${availableSpace} available)`);

            if (availableSpace > 0) {
              // Add as many as possible to existing batch
              const companiesForExistingBatch = encodedCompanies.slice(0, availableSpace);
              const remainingCompanies = encodedCompanies.slice(availableSpace);

              const updatedBatchData = {
                companies: [...existingCompanies, ...companiesForExistingBatch]
              };

              batchesToUpload.push({
                batchId: targetBatchId,
                data: updatedBatchData,
                isUpdate: true
              });

              // Create additional batches for remaining companies
              let currentBatchNumber = parseInt(targetBatchId.match(/batch_(\d+)/)[1]);
              for (let i = 0; i < remainingCompanies.length; i += chunkSize) {
                currentBatchNumber++;
                const chunk = remainingCompanies.slice(i, i + chunkSize);
                batchesToUpload.push({
                  batchId: `batch_${currentBatchNumber}`,
                  data: { companies: chunk },
                  isUpdate: false
                });
              }
            } else {
              // Batch is full, create new batches starting from next number
              let currentBatchNumber = parseInt(targetBatchId.match(/batch_(\d+)/)[1]);
              for (let i = 0; i < encodedCompanies.length; i += chunkSize) {
                currentBatchNumber++;
                const chunk = encodedCompanies.slice(i, i + chunkSize);
                batchesToUpload.push({
                  batchId: `batch_${currentBatchNumber}`,
                  data: { companies: chunk },
                  isUpdate: false
                });
              }
            }
          } else {
            // Target batch doesn't exist, create it
            console.log(`Creating new batch ${targetBatchId}`);
            const chunk = encodedCompanies.slice(0, chunkSize);
            const remainingCompanies = encodedCompanies.slice(chunkSize);

            batchesToUpload.push({
              batchId: targetBatchId,
              data: { companies: chunk },
              isUpdate: false
            });

            // Create additional batches if needed
            let currentBatchNumber = parseInt(targetBatchId.match(/batch_(\d+)/)[1]);
            for (let i = 0; i < remainingCompanies.length; i += chunkSize) {
              currentBatchNumber++;
              const chunk = remainingCompanies.slice(i, i + chunkSize);
              batchesToUpload.push({
                batchId: `batch_${currentBatchNumber}`,
                data: { companies: chunk },
                isUpdate: false
              });
            }
          }
        } else {
          // Auto smart batching
          const batchInfo = await getNextBatchInfo(chunkSize);
          const { nextBatchNumber, shouldCreateNewBatch, lastBatchData, lastBatchId } = batchInfo;

          console.log(`Smart batching: Starting from batch_${nextBatchNumber}, Create new: ${shouldCreateNewBatch}`);

          let currentBatchNumber = nextBatchNumber;

          if (!shouldCreateNewBatch && lastBatchData) {
            // Append to existing batch
            const existingCompanies = lastBatchData.companies || [];
            const availableSpace = chunkSize - existingCompanies.length;

            console.log(`Appending to existing batch_${currentBatchNumber} (${existingCompanies.length}/${chunkSize} used, ${availableSpace} available)`);

            // Split new companies to fill existing batch and create new ones if needed
            const companiesForExistingBatch = encodedCompanies.slice(0, availableSpace);
            const remainingCompanies = encodedCompanies.slice(availableSpace);

            // Update existing batch with additional companies
            const updatedBatchData = {
              companies: [...existingCompanies, ...companiesForExistingBatch]
            };

            batchesToUpload.push({
              batchId: lastBatchId,
              data: updatedBatchData,
              isUpdate: true
            });

            // Create additional batches for remaining companies
            for (let i = 0; i < remainingCompanies.length; i += chunkSize) {
              currentBatchNumber++;
              const chunk = remainingCompanies.slice(i, i + chunkSize);
              batchesToUpload.push({
                batchId: `batch_${currentBatchNumber}`,
                data: { companies: chunk },
                isUpdate: false
              });
            }
          } else {
            // Create new batches from scratch
            for (let i = 0; i < encodedCompanies.length; i += chunkSize) {
              const chunk = encodedCompanies.slice(i, i + chunkSize);
              batchesToUpload.push({
                batchId: `batch_${currentBatchNumber}`,
                data: { companies: chunk },
                isUpdate: false
              });
              currentBatchNumber++;
            }
          }

        }

        console.log(`Prepared ${batchesToUpload.length} batch operations (${batchesToUpload.filter(b => b.isUpdate).length} updates, ${batchesToUpload.filter(b => !b.isUpdate).length} new) with ${chunkSize} companies per batch`);

        // 6. Upload batches
        const totalBatches = batchesToUpload.length;
        let uploadedBatches = 0;

        for (const batch of batchesToUpload) {
          const { batchId, data, isUpdate } = batch;

          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount <= maxRetries) {
            try {
              // Use setDoc for both new batches and updates
              await setDoc(doc(db, "companyleads", batchId), data);
              break; // Success, exit retry loop
            } catch (error) {
              retryCount++;
              if (retryCount > maxRetries) {
                console.log(`Failed to ${isUpdate ? 'update' : 'upload'} ${batchId} after ${maxRetries} retries:`, error);
                throw error; // Re-throw to stop the entire upload
              }

              const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
              console.log(`${isUpdate ? 'Update' : 'Upload'} failed for ${batchId}, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          uploadedBatches++;

          // Update progress
          const progressPercent = Math.round((uploadedBatches / totalBatches) * 100);
          if (onProgress) {
            onProgress(progressPercent);
          }

          // Log upload progress
          const recordCount = data.companies.length;
          console.log(`${isUpdate ? 'Updated' : 'Uploaded'} ${batchId} (${recordCount} records) - ${uploadedBatches}/${totalBatches} batches complete`);

          // Add delay between batches to prevent overwhelming Firestore write stream
          if (uploadedBatches < totalBatches) { // Don't delay after the last batch
            console.log(`Waiting 2000ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        console.log(`Successfully uploaded ${encodedCompanies.length} companies in ${totalBatches} batches to Firestore!`);
        resolve({
          totalCompanies: encodedCompanies.length,
          totalBatches,
          batchSize: chunkSize,
          smartBatching: true,
          batchesUpdated: batchesToUpload.filter(b => b.isUpdate).length,
          batchesCreated: batchesToUpload.filter(b => !b.isUpdate).length,
          originalCompaniesCount: companies.length
        });

      } catch (error) {
        console.error("Error during Excel upload:", error);
        handleFirestoreIndexError(error, "Excel upload");
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      reject(error);
    };

    // Start reading the file
    reader.readAsArrayBuffer(file);
  });
};