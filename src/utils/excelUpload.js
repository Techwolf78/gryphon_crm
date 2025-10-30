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
// 4. Split into chunks of 2000 items per batch (under Firestore 1MB limit)
// 5. Upload each batch to Firestore collection 'companyleads' as documents: batch_1, batch_2, etc.
// 6. Each document contains { companies: [encodedCompany1, encodedCompany2, ...] }
// 7. Use setDoc(doc(db, "companies", batchId), { companies: chunk })
// 8. Log progress: "✅ Uploaded batch_1 (2000 records)"
// 9. Handle 58,000 records safely without exceeding Firestore limits
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet).filter(row =>
          row['CompanyName'] && row['CompanyName'].toString().trim() !== ''
        );

        console.log(`📊 Found ${jsonData.length} company records in Excel file`);

        // 2. Convert each row to company object
        const companies = jsonData.map(row => ({
          name: row['CompanyName'] || '',
          contactPerson: row['ContactPerson'] || '',
          designation: row['Designation'] || '',
          phone: row['Phone'] || '',
          companyUrl: row['CompanyUrl'] || '',
          linkedinUrl: row['LinkedinUrl'] || '',
          // Additional fields that may be in Excel
          email: row['Email'] || '',
          location: row['Location'] || '',
          industry: row['Industry'] || '',
          companySize: row['CompanySize'] || '',
          source: row['Source'] || 'Excel Upload',
          notes: row['Notes'] || '',
          status: row['Status'] || 'hot',
          contacts: [], // Initialize empty contacts array
        }));

        console.log("🔄 Converting companies to Base64 encoded JSON strings...");

        // 3. Encode each company object as Base64 JSON string
        const encodedCompanies = companies.map(company =>
          btoa(JSON.stringify(company))
        );

        console.log(`✨ Encoded ${encodedCompanies.length} companies as Base64 strings`);

        // 4. Split into chunks of 2000 items per batch
        const chunkSize = 2000;
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

          // 6. Use setDoc for each batch
          await setDoc(doc(db, "companyleads", batchId), batchData);

          uploadedBatches++;

          // Update progress
          const progressPercent = Math.round((uploadedBatches / totalBatches) * 100);
          if (onProgress) {
            onProgress(progressPercent);
          }

          // 7. Log upload progress
          console.log(`✅ Uploaded ${batchId} (${chunk.length} records) - ${uploadedBatches}/${totalBatches} batches complete`);
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