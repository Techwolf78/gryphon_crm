# Excel Upload Implementation

This implementation provides a complete solution for uploading 58,000+ company records from Excel files to Firestore with the following features:

## Features

- ✅ **Excel Processing**: Reads Excel files using the `xlsx` library
- ✅ **Base64 Encoding**: Converts each company object to Base64 JSON strings using `btoa(JSON.stringify(company))`
- ✅ **Batch Processing**: Splits data into chunks of 2000 records to stay under Firestore's 1MB limit
- ✅ **Firestore Upload**: Stores batches as documents in the `companies` collection (batch_1, batch_2, etc.)
- ✅ **Progress Tracking**: Real-time progress updates during upload
- ✅ **Error Handling**: Comprehensive error handling with clickable Firestore index links
- ✅ **Validation**: File type validation and data structure validation

## Usage

### 1. Import the utility function
```javascript
import { uploadCompaniesFromExcel } from '../utils/excelUpload';
```

### 2. Use in a React component
```javascript
const [isUploading, setIsUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);

const handleFileUpload = async (file) => {
  setIsUploading(true);
  try {
    const result = await uploadCompaniesFromExcel(file, (progress) => {
      setUploadProgress(progress);
    });
    console.log('Upload complete:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  } finally {
    setIsUploading(false);
  }
};
```

### 3. Excel File Format
The Excel file should have the following columns:

**Required Columns:**
- **CompanyName** (required)
- **ContactPerson**
- **Designation**
- **Phone**
- **CompanyUrl**
- **LinkedinUrl**

**Optional Columns:**
- **Email**
- **Location**
- **Industry**
- **CompanySize**
- **Source**
- **Notes**
- **Status** (hot, warm, cold, onboarded)

## Implementation Details

### Data Structure
Each company is converted to:
```javascript
{
  name: "Company Name",
  contactPerson: "Contact Person",
  designation: "Job Title",
  phone: "Phone Number",
  companyUrl: "https://company.com",
  linkedinUrl: "https://linkedin.com/company/name",
  // Optional fields
  email: "contact@email.com",
  location: "City, State",
  industry: "Technology",
  companySize: "100-500",
  source: "Excel Upload",
  notes: "Additional notes",
  status: "hot",
  contacts: []
}
```

### UI Field Mapping
The uploaded data is mapped to UI component expectations:
```javascript
{
  companyName: decodedCompany.name,
  pocName: decodedCompany.contactPerson,
  pocDesignation: decodedCompany.designation,
  pocPhone: decodedCompany.phone,
  companyUrl: decodedCompany.companyUrl,
  companyWebsite: decodedCompany.companyUrl, // Alias
  linkedinUrl: decodedCompany.linkedinUrl,
  pocLinkedin: decodedCompany.linkedinUrl, // Alias
  pocMail: decodedCompany.email,
  pocLocation: decodedCompany.location,
  industry: decodedCompany.industry,
  companySize: decodedCompany.companySize,
  source: decodedCompany.source,
  notes: decodedCompany.notes,
  status: decodedCompany.status || "hot",
  contacts: []
}
```

## Testing and Validation

### Upload Testing
1. **Small Batch Test**: Upload a file with 5-10 companies to verify basic functionality
2. **Large Batch Test**: Upload a file with 2000+ companies to test batching logic
3. **Full Dataset Test**: Upload the complete 58,000+ company file

### Data Validation
- Check that all required fields are present
- Verify Base64 encoding/decoding works correctly
- Confirm batch documents are created in Firestore
- Validate UI components display data correctly

### Performance Validation
- Monitor Firestore read/write operations
- Check pagination performance with large datasets
- Verify no app hanging with 58,000+ records

## Troubleshooting

### Common Issues

**Upload Fails with "Invalid File Format"**
- Ensure Excel file has correct column headers (case-sensitive)
- Check that required columns are present
- Verify file is .xlsx format

**Data Not Appearing in UI**
- Check browser console for Base64 decoding errors
- Verify batch documents exist in Firestore 'companyleads' collection
- Confirm field mapping in CompanyLeads.jsx

**Performance Issues**
- Ensure batch size doesn't exceed 2000 companies
- Check Firestore index configuration
- Monitor network requests for large datasets

**Firestore Index Errors**
- Click the generated index URL in console logs
- Wait for index creation to complete (can take 5-10 minutes)
- Retry the operation after index is built

### Debug Commands
```javascript
// Check batch documents in Firestore
const batches = await getDocs(collection(db, 'companyleads'));
batches.forEach(doc => console.log(doc.id, doc.data()));

// Test Base64 decoding
const decoded = JSON.parse(atob(encodedString));
console.log(decoded);
```

## Complete Workflow

1. **Prepare Excel File**: Create .xlsx file with required and optional columns
2. **Upload via UI**: Use the bulk upload modal in the Sales dashboard
3. **Batch Processing**: System automatically splits into 2000-company batches
4. **Base64 Encoding**: Each batch is encoded and stored in Firestore
5. **Data Retrieval**: UI components decode and display data with field mapping
6. **CRUD Operations**: Create, read, update, delete work with batch structure
7. **Pagination**: Efficient loading of large datasets without performance issues

## Next Steps

- Test full CRUD operations with uploaded data
- Monitor performance with complete 58,000+ company dataset
- Consider implementing data export functionality
- Add data validation rules for uploaded content

### Firestore Storage
- **Collection**: `companyleads`
- **Documents**: `batch_1`, `batch_2`, `batch_3`, etc.
- **Structure**:
```javascript
{
  companies: [
    "base64-encoded-company-1",
    "base64-encoded-company-2",
    // ... up to 2000 companies per batch
  ]
}
```

### Batch Size
- Maximum 2000 companies per batch
- Each batch stays under Firestore's 1MB document limit
- For 58,000 companies: ~29 batches

### Error Handling
- Firestore index errors are detected and parsed
- Clickable console links are provided for index creation
- Comprehensive logging with emojis for better developer experience

## Files Created

1. **`src/utils/excelUpload.js`**: Core upload functionality
2. **`src/components/Sales/BulkUploadModal.jsx`**: React component with UI

## Dependencies

- `xlsx`: For Excel file processing
- `firebase/firestore`: For Firestore operations
- React hooks: `useState` for component state

## Testing

To test the implementation:
1. Create an Excel file with the required columns
2. Add 58,000+ rows of company data
3. Use the BulkUploadModal component to upload
4. Monitor console for progress and any index creation links
5. Verify data appears in Firestore `companies` collection