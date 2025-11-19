import { db } from "../firebase";
import { collection, getDocs, query, orderBy, doc, setDoc } from "firebase/firestore";

// Generate deduplication key using all 5 fields as specified by user
const generateCompanyKeyExact = (company) => {
  const name = company.name?.toString().toLowerCase().trim() || '';
  const contactPerson = company.contactPerson?.toString().toLowerCase().trim() || '';
  const designation = company.designation?.toString().toLowerCase().trim() || '';
  const phone = company.phone?.toString().toLowerCase().trim() || '';
  const email = company.email?.toString().toLowerCase().trim() || '';
  const key = `${name}|${contactPerson}|${designation}|${phone}|${email}`;
  return btoa(encodeURIComponent(key)).substring(0, 50);
};

// Find and remove duplicates across all batches
export const removeDuplicateCompanies = async (onProgress = null) => {
  try {
    console.log("🔍 Starting duplicate removal process...");

    // Get all batches
    const batchesQuery = query(collection(db, "companyleads"), orderBy("__name__"));
    const batchesSnapshot = await getDocs(batchesQuery);

    const allCompanies = [];
    const batchMap = new Map(); // batchId -> companies array

    // Decode all companies from all batches
    for (const batchDoc of batchesSnapshot.docs) {
      const batchData = batchDoc.data();
      const encodedCompanies = batchData.companies || [];
      const decodedCompanies = [];

      for (let i = 0; i < encodedCompanies.length; i++) {
        try {
          const decodedCompany = JSON.parse(decodeURIComponent(atob(encodedCompanies[i])));
          console.log(`📋 Decoded company ${i} in ${batchDoc.id}:`, {
            name: decodedCompany.name,
            contactPerson: decodedCompany.contactPerson,
            designation: decodedCompany.designation,
            phone: decodedCompany.phone,
            email: decodedCompany.email
          });
          decodedCompanies.push({
            ...decodedCompany,
            batchId: batchDoc.id,
            indexInBatch: i,
            encodedData: encodedCompanies[i]
          });
        } catch (error) {
          console.warn(`⚠️ Could not decode company ${i} in ${batchDoc.id}:`, error);
        }
      }

      batchMap.set(batchDoc.id, decodedCompanies);
      allCompanies.push(...decodedCompanies);
    }

    console.log(`📊 Loaded ${allCompanies.length} companies from ${batchesSnapshot.size} batches`);

    // Group companies by deduplication key
    const companiesByKey = new Map();

    allCompanies.forEach(company => {
      const key = generateCompanyKeyExact(company);
      console.log(`🔑 Generated key for ${company.name}: ${key}`);
      if (!companiesByKey.has(key)) {
        companiesByKey.set(key, []);
      }
      companiesByKey.get(key).push(company);
    });

    // Debug: Show all keys and their counts
    console.log("🔍 Key distribution:");
    companiesByKey.forEach((companies, key) => {
      console.log(`  Key: ${key} -> ${companies.length} companies`);
    });

    // Find duplicates (groups with more than 1 company)
    const duplicates = [];
    companiesByKey.forEach((companies, key) => {
      if (companies.length > 1) {
        duplicates.push({ key, companies });
      }
    });

    console.log(`🧹 Found ${duplicates.length} duplicate groups (${duplicates.reduce((sum, group) => sum + group.companies.length, 0)} total duplicate records)`);

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!");
      return { duplicatesRemoved: 0, message: "No duplicates found" };
    }

    // For each duplicate group, keep the first one and mark others for deletion
    let totalRemoved = 0;

    for (const duplicateGroup of duplicates) {
      const { companies } = duplicateGroup;

      // Sort by creation date (newest first), keep the most recent
      companies.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || '1970-01-01');
        const dateB = new Date(b.createdAt || b.updatedAt || '1970-01-01');
        return dateB - dateA; // Newest first
      });

      // Keep the first (newest), remove the rest
      const toKeep = companies[0];
      const toRemove = companies.slice(1);

      console.log(`🗑️ Removing ${toRemove.length} duplicates for: ${toKeep.name} (${toKeep.contactPerson})`);

      // Remove duplicates from their respective batches
      for (const company of toRemove) {
        const batchCompanies = batchMap.get(company.batchId);
        const index = batchCompanies.findIndex(c => c.indexInBatch === company.indexInBatch);

        if (index !== -1) {
          batchCompanies.splice(index, 1);
          totalRemoved++;
        }
      }
    }

    // Save updated batches back to Firestore
    let processedBatches = 0;
    for (const [batchId, companies] of batchMap) {
      if (companies.length === 0) {
        console.log(`🗑️ Batch ${batchId} is now empty, skipping...`);
        continue;
      }

      // Re-encode companies
      const encodedCompanies = companies.map(c => c.encodedData);

      await setDoc(doc(db, "companyleads", batchId), {
        companies: encodedCompanies
      });

      processedBatches++;

      if (onProgress) {
        onProgress(Math.round((processedBatches / batchMap.size) * 100));
      }

      console.log(`✅ Updated batch ${batchId} (${companies.length} companies remaining)`);
    }

    console.log(`🎉 Successfully removed ${totalRemoved} duplicate companies!`);
    return {
      duplicatesRemoved: totalRemoved,
      duplicateGroups: duplicates.length,
      batchesUpdated: processedBatches,
      message: `Removed ${totalRemoved} duplicates across ${duplicates.length} groups`
    };

  } catch (error) {
    console.error("❌ Error during duplicate removal:", error);
    throw error;
  }
};

// Alternative: Mark duplicates instead of deleting (safer)
export const markDuplicateCompanies = async () => {
  // Similar logic but adds a "isDuplicate: true" flag instead of deleting
  // This allows you to filter them out in the UI without losing data
  console.log("🚫 Mark duplicates function not implemented yet - use removeDuplicateCompanies for now");
};