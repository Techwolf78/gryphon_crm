import * as XLSX from 'xlsx';
import { db } from "../firebase";
import { doc, setDoc, collection, getDocs, query, orderBy } from "firebase/firestore";

// Smart batching utility to find the next available batch number and check existing batches
const getNextBatchInfo = async () => {
  try {
    console.log("🔍 Checking existing batches in Firestore...");

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

    console.log(`� Found ${highestBatchNumber} existing batches. Last batch: ${lastBatchId}`);

    // Check if the last batch is almost full (1499+ records)
    let shouldCreateNewBatch = true;
    let nextBatchNumber = highestBatchNumber + 1;

    if (lastBatchData && lastBatchData.companies) {
      const lastBatchSize = lastBatchData.companies.length;
      console.log(`📏 Last batch (${lastBatchId}) has ${lastBatchSize} records`);

      if (lastBatchSize < 1499) {
        // Last batch has space, we can append to it
        shouldCreateNewBatch = false;
        nextBatchNumber = highestBatchNumber;
        console.log(`✅ Will append to existing batch_${nextBatchNumber} (${lastBatchSize}/1500 records)`);
      } else {
        // Last batch is full or almost full, create new batch
        console.log(`� Last batch is full (${lastBatchSize}/1500), will create batch_${nextBatchNumber}`);
      }
    } else if (highestBatchNumber === 0) {
      // No existing batches, start from 1
      nextBatchNumber = 1;
      console.log("🆕 No existing batches found, starting from batch_1");
    }

    return {
      nextBatchNumber,
      shouldCreateNewBatch,
      lastBatchData: shouldCreateNewBatch ? null : lastBatchData,
      lastBatchId: shouldCreateNewBatch ? null : lastBatchId
    };
  } catch (error) {
    console.error("❌ Error checking existing batches:", error);
    // If we can't check existing batches, start from batch_1
    console.log("⚠️ Could not check existing batches, starting from batch_1");
    return {
      nextBatchNumber: 1,
      shouldCreateNewBatch: true,
      lastBatchData: null,
      lastBatchId: null
    };
  }
};

// Generate unique identifier for deduplication
const generateCompanyKey = (company) => {
  const name = company.name?.toString().toLowerCase().trim() || '';
  const contactPerson = company.contactPerson?.toString().toLowerCase().trim() || '';
  const phone = company.phone?.toString().toLowerCase().trim() || '';
  const key = `${name}_${contactPerson}_${phone}`;
  return btoa(encodeURIComponent(key)).substring(0, 50); // Limit length for Firestore
};

// Check for existing companies to prevent duplicates
const checkExistingCompanies = async (companies) => {
  try {
    console.log("🔍 Checking for existing companies to prevent duplicates...");

    // Get all existing batches
    const batchesQuery = query(collection(db, "companyleads"), orderBy("__name__"));
    const batchesSnapshot = await getDocs(batchesQuery);

    const existingKeys = new Set();
    let totalExistingCompanies = 0;
    let skippedCompanies = 0;

    for (const batchDoc of batchesSnapshot.docs) {
      const batchData = batchDoc.data();
      if (batchData.companies && Array.isArray(batchData.companies)) {
        for (const encodedCompany of batchData.companies) {
          try {
            // Decode the company to check for duplicates
            const decodedCompany = JSON.parse(decodeURIComponent(atob(encodedCompany)));
            // Ensure the decoded company has the expected structure
            if (decodedCompany && typeof decodedCompany === 'object') {
              const key = generateCompanyKey(decodedCompany);
              existingKeys.add(key);
              totalExistingCompanies++;
            } else {
              console.warn("⚠️ Invalid company data structure, skipping:", decodedCompany);
              skippedCompanies++;
            }
          } catch (decodeError) {
            // Skip invalid encoded data but continue processing
            console.warn("⚠️ Could not decode company data, skipping:", decodeError.message);
            skippedCompanies++;
          }
        }
      }
    }

    console.log(`📊 Found ${totalExistingCompanies} existing companies across ${batchesSnapshot.size} batches (${skippedCompanies} skipped due to decode errors)`);

    // Filter out duplicates
    const uniqueCompanies = [];
    const duplicateCount = companies.length;

    for (const company of companies) {
      const key = generateCompanyKey(company);
      if (!existingKeys.has(key)) {
        uniqueCompanies.push(company);
      }
    }

    const removedDuplicates = duplicateCount - uniqueCompanies.length;
    console.log(`🧹 Removed ${removedDuplicates} duplicate companies, ${uniqueCompanies.length} unique companies to upload`);

    return {
      uniqueCompanies,
      duplicatesRemoved: removedDuplicates,
      totalExisting: totalExistingCompanies
    };
  } catch (error) {
    console.error("❌ Error checking for duplicates:", error);
    // If we can't check for duplicates, proceed with all companies but warn the user
    console.warn("⚠️ Could not check for duplicates, proceeding with all companies");
    return {
      uniqueCompanies: companies,
      duplicatesRemoved: 0,
      totalExisting: 0
    };
  }
};

// Utility function to handle Firestore index errors
const handleFirestoreIndexError = (error, operation = "operation") => {
  console.error(`❌ Firestore Index Error in ${operation}:`, error);

  if (error.message && error.message.includes('index')) {
    console.error("🔍 Firestore Index Error Detected!");
    console.error("💡 To fix this, create the required index:");

    // Try to extract index URL from error message
    const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    if (indexUrlMatch) {
      console.log("🔗 %cClick here to create index", "color: blue; text-decoration: underline; cursor: pointer; font-weight: bold;", indexUrlMatch[0]);
      console.log("📋 Or copy this URL: " + indexUrlMatch[0]);

      // Make the link clickable in some browsers
      console.log("🚨 After creating the index, refresh the page to retry the " + operation + ".");
    } else {
      console.error("❓ Could not extract index URL from error.");
      console.log("🔗 Go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes");
      console.log("📝 Replace YOUR_PROJECT_ID with your actual Firebase project ID");
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
export const uploadCompaniesFromExcel = async (file, onProgress = null, assigneeId = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        console.log("📂 Reading Excel file...");

        // 1. Read the Excel file using xlsx library
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON, filter out empty rows
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log("🔍 Raw Excel data (first 3 rows):", rawJsonData.slice(0, 3));
        console.log("📋 Available columns:", rawJsonData.length > 0 ? Object.keys(rawJsonData[0]) : "No data rows");

        const jsonData = rawJsonData.filter(row => {
          // Check for CompanyName with different possible variations
          const companyName = row['CompanyName'] || row['Company Name'] || row['companyName'] || row['company_name'];
          return companyName && companyName.toString().trim() !== '';
        });

        console.log(`📊 Found ${jsonData.length} company records in Excel file`);

        // If no companies found, provide helpful error message
        if (jsonData.length === 0) {
          console.error("❌ No valid company records found in Excel file!");
          console.error("💡 Please ensure your Excel file has:");
          console.error("   - Column headers in the first row");
          console.error("   - 'CompanyName' or 'Company Name' column with company names");
          console.error("   - At least one row of data below the headers");
          throw new Error("No valid company records found. Please check your Excel file format and column names.");
        }

        // 2. Convert each row to company object
        const companies = jsonData.map(row => {
          const company = {
            name: row['CompanyName'] || row['Company Name'] || row['companyName'] || row['company_name'] || '',
            contactPerson: row['ContactPerson'] || row['Contact Person'] || row['contactPerson'] || row['contact_person'] || '',
            designation: row['Designation'] || row['designation'] || '',
            phone: row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'] || '',
            companyUrl: row['CompanyUrl'] || row['Company URL'] || row['Company Url'] || row['companyUrl'] || row['company_url'] || '',
            linkedinUrl: row['LinkedinUrl'] || row['LinkedIn URL'] || row['LinkedIn Url'] || row['linkedinUrl'] || row['linkedin_url'] || '',
            // Additional fields that may be in Excel
            email: row['Email'] || row['email'] || '',
            location: row['Location'] || row['location'] || '',
            industry: row['Industry'] || row['industry'] || '',
            companySize: row['CompanySize'] || row['Company Size'] || row['companySize'] || row['company_size'] || '',
            source: row['Source'] || row['source'] || 'Excel Upload',
            notes: row['Notes'] || row['notes'] || '',
            status: row['Status'] || row['status'] || 'cold',
            contacts: [], // Initialize empty contacts array
          };

          // If assigneeId is provided, assign the company to that user
          if (assigneeId) {
            company.assignedTo = assigneeId;
            company.assignedBy = assigneeId; // Assuming the uploader is assigning to themselves
            company.assignedAt = new Date().toISOString();
          }

          return company;
        });

        // 3. Check for duplicates before proceeding
        const deduplicationResult = await checkExistingCompanies(companies);
        const { uniqueCompanies, duplicatesRemoved, totalExisting } = deduplicationResult;

        if (uniqueCompanies.length === 0) {
          console.log("ℹ️ All companies in the Excel file are already uploaded. No new uploads needed.");
          resolve({
            totalCompanies: 0,
            totalBatches: 0,
            batchSize: 1000, // Reduced batch size
            smartBatching: true,
            duplicatesRemoved,
            totalExisting,
            message: "All companies already exist in the database"
          });
          return;
        }

        console.log("🔄 Converting companies to Base64 encoded JSON strings...");

        // 4. Encode each company object as Base64 JSON string (Unicode-safe)
        const encodedCompanies = uniqueCompanies.map(company => {
          // Use encodeURIComponent + btoa to handle Unicode characters
          const jsonString = JSON.stringify(company);
          const uriEncoded = encodeURIComponent(jsonString);
          return btoa(uriEncoded);
        });

        console.log(`✨ Encoded ${encodedCompanies.length} companies as Base64 strings (after removing ${duplicatesRemoved} duplicates)`);

        // 4. Get smart batching information
        const batchInfo = await getNextBatchInfo();
        const { nextBatchNumber, shouldCreateNewBatch, lastBatchData, lastBatchId } = batchInfo;

        console.log(`🎯 Smart batching: Starting from batch_${nextBatchNumber}, Create new: ${shouldCreateNewBatch}`);

        // 5. Handle batching logic with reduced batch size to prevent 1MB limit
        let batchesToUpload = [];
        let currentBatchNumber = nextBatchNumber;
        const chunkSize = 1000; // Reduced from 1500 to prevent 1MB limit issues

        if (!shouldCreateNewBatch && lastBatchData) {
          // Append to existing batch
          const existingCompanies = lastBatchData.companies || [];
          const availableSpace = chunkSize - existingCompanies.length;

          console.log(`📎 Appending to existing batch_${currentBatchNumber} (${existingCompanies.length}/${chunkSize} used, ${availableSpace} available)`);

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

        console.log(`📦 Prepared ${batchesToUpload.length} batch operations (${batchesToUpload.filter(b => b.isUpdate).length} updates, ${batchesToUpload.filter(b => !b.isUpdate).length} new) with ${chunkSize} companies per batch`);

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
                console.error(`❌ Failed to ${isUpdate ? 'update' : 'upload'} ${batchId} after ${maxRetries} retries:`, error);
                throw error; // Re-throw to stop the entire upload
              }

              const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
              console.log(`⚠️ ${isUpdate ? 'Update' : 'Upload'} failed for ${batchId}, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
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
          console.log(`${isUpdate ? '🔄 Updated' : '✅ Uploaded'} ${batchId} (${recordCount} records) - ${uploadedBatches}/${totalBatches} batches complete`);

          // Add delay between batches to prevent overwhelming Firestore write stream
          if (uploadedBatches < totalBatches) { // Don't delay after the last batch
            console.log(`⏳ Waiting 2000ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        console.log(`🎉 Successfully uploaded ${encodedCompanies.length} companies in ${totalBatches} batches to Firestore!`);
        resolve({
          totalCompanies: encodedCompanies.length,
          totalBatches,
          batchSize: chunkSize,
          smartBatching: true,
          batchesUpdated: batchesToUpload.filter(b => b.isUpdate).length,
          batchesCreated: batchesToUpload.filter(b => !b.isUpdate).length,
          duplicatesRemoved,
          totalExisting,
          originalCompaniesCount: companies.length
        });

      } catch (error) {
        console.error("❌ Error during Excel upload:", error);
        handleFirestoreIndexError(error, "Excel upload");
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("❌ Error reading file:", error);
      reject(error);
    };

    // Start reading the file
    reader.readAsArrayBuffer(file);
  });
};