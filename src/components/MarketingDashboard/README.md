# MarketingDashboard Components

## Overview
The MarketingDashboard provides a comprehensive interface for managing digital marketing contracts with three main sections: Contracts, Analytics, and Task Manager.

## Database Integration
- **Collection**: `digitalMarketing` (primary storage for contract data)
- **Secondary Collection**: `placementData` (for compatibility with existing systems)
- **Real-time Updates**: Uses Firestore listeners for live data synchronization

## Component Structure
- `MarketingDashboard.jsx` : Main dashboard with section navigation and Firestore data management
- `DMTrainingForm.jsx` : Comprehensive digital marketing onboarding form with validation
- `ContractsTable.jsx` : Contract display and management table with inline editing
- `Analytics.jsx` : Analytics overview and insights
- `TaskManager.jsx` : Task management interface

## Form Sections (DMTrainingForm)
- `DMCollegeInfoSection.jsx` : College and institution details
- `DMPOCInfoSection.jsx` : Point of contact information
- `DMStudentBreakdownSection.jsx` : Service selection and student count
- `DMPaymentInfoSection.jsx` : Payment structure and GST calculations
- `DMMOUUploadSection.jsx` : MOU document upload and contract dates

## Key Features
- Project code generation with college/course/year format
- Service-based pricing with GST calculations
- MOU document upload to Cloudinary
- Duplicate project code validation
- Real-time form validation and error handling
- Responsive design with Tailwind CSS

## Notes
- Optimized for digital marketing services (no student list uploads)
- Uses React.lazy for performance optimization
- Includes comprehensive error handling and user feedback
