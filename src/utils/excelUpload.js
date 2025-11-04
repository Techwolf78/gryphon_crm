import * as XLSX from 'xlsx';
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

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

// Complete implementation for uploading 58,000 companies from Excel
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
export const uploadCompaniesFromExcel = async (file, onProgress = null) => {
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
        const companies = jsonData.map(row => ({
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
        }));

        console.log("🔄 Converting companies to Base64 encoded JSON strings...");

        // 3. Encode each company object as Base64 JSON string (Unicode-safe)
        const encodedCompanies = companies.map(company => {
          // Use encodeURIComponent + btoa to handle Unicode characters
          const jsonString = JSON.stringify(company);
          const uriEncoded = encodeURIComponent(jsonString);
          return btoa(uriEncoded);
        });

        console.log(`✨ Encoded ${encodedCompanies.length} companies as Base64 strings`);

        // 4. Split into chunks of 1500 items per batch (under Firestore 1MB limit)
        const chunkSize = 1500;
        const chunks = [];
        for (let i = 0; i < encodedCompanies.length; i += chunkSize) {
          chunks.push(encodedCompanies.slice(i, i + chunkSize));
        }

        console.log(`📦 Split into ${chunks.length} batches of ${chunkSize} companies each`);

        // 5-6. Upload each batch to Firestore collection 'companies'
        const totalBatches = chunks.length;
        let uploadedBatches = 0;

        for (let i = 0; i < chunks.length; i++) {
          const batchId = `batch_${i + 1}`;
          const chunk = chunks[i];

          // Create document data
          const batchData = {
            companies: chunk
          };

          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount <= maxRetries) {
            try {
              // 6. Use setDoc for each batch
              await setDoc(doc(db, "companyleads", batchId), batchData);
              break; // Success, exit retry loop
            } catch (error) {
              retryCount++;
              if (retryCount > maxRetries) {
                console.error(`❌ Failed to upload ${batchId} after ${maxRetries} retries:`, error);
                throw error; // Re-throw to stop the entire upload
              }
              
              const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
              console.log(`⚠️ Upload failed for ${batchId}, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          uploadedBatches++;

          // Update progress
          const progressPercent = Math.round((uploadedBatches / totalBatches) * 100);
          if (onProgress) {
            onProgress(progressPercent);
          }

          // 7. Log upload progress
          console.log(`✅ Uploaded ${batchId} (${chunk.length} records) - ${uploadedBatches}/${totalBatches} batches complete`);

          // Add delay between batches to prevent overwhelming Firestore write stream
          if (i < chunks.length - 1) { // Don't delay after the last batch
            console.log(`⏳ Waiting 2000ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        console.log(`🎉 Successfully uploaded ${encodedCompanies.length} companies in ${totalBatches} batches to Firestore!`);
        resolve({
          totalCompanies: encodedCompanies.length,
          totalBatches,
          batchSize: chunkSize
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