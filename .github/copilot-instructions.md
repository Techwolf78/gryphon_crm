# Gryphon CRM - AI Coding Assistant Instructions

## Project Overview
This is a React-based CRM system for Gryphon Academy built with Vite, featuring Firebase Firestore, MSAL authentication, and role-based access control. The application manages sales leads, learning & development, placements, HR operations, and procurement across multiple departments.

## Architecture & Tech Stack

### Core Technologies
- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS + Material-UI + Framer Motion
- **Backend**: Firebase Firestore
- **Authentication**: Dual system (Firebase + Azure MSAL)
- **Routing**: React Router DOM with lazy loading
- **State**: React Context (AuthContext, NotificationsContext)

### Key Directories
- `src/components/` - Reusable UI components organized by feature
- `src/pages/` - Main page components with lazy loading
- `src/context/` - React contexts for global state
- `src/utils/` - Firebase utilities, Excel processing, audit logging
- `src/assets/auth/` - Authentication configurations

## Authentication & Security

### Dual Authentication System
```javascript
// Firebase handles user data lookup and session persistence
// MSAL handles enterprise SSO and token management
```

**Key Patterns:**
- Session tracking with location data and activity monitoring
- Automatic logout after 12 hours or 30 minutes of inactivity
- Audit logging for all login/logout events with IP and location
- Role-based access control with department-specific permissions

### Session Management
```javascript
// Activity tracking with mouse/keyboard events
// Location data collection via geolocation API
// Reverse geocoding for address resolution
// Session persistence with localStorage/sessionStorage
```

## Component Patterns

### Lazy Loading Strategy
```jsx
// Heavy components are lazy-loaded with Suspense
const LeadsTable = lazy(() => import("../components/Sales/LeadTable"));

<Suspense fallback={<ComponentLoader />}>
  <LeadsTable />
</Suspense>
```

### Error Boundary Usage
```jsx
// Wrap components with ErrorBoundary for graceful error handling
<ErrorBoundary>
  <Component />
</ErrorBoundary>
```

### Performance Optimization
```jsx
// React.memo for component memoization
const TrainerRow = React.memo(({ trainer, onUpdate, ...props }) => {
  // Component logic
});

// useMemo for expensive calculations
const filteredTrainers = useMemo(() => {
  return trainers.filter(trainer => trainer.domain === selectedDomain);
}, [trainers, selectedDomain]);

// useCallback for stable function references
const handleUpdate = useCallback((trainerId, field, value) => {
  // Update logic
}, []);
```

### Firebase Query Patterns
```javascript
// Use safeFirebaseQuery for rate-limited, retry-enabled queries
import { safeFirebaseQuery } from '../utils/firebaseUtils';

const result = await safeFirebaseQuery(() =>
  getDocs(query(collection(db, "leads"), where("status", "==", "hot")))
);
```

## Data Management

### Excel Upload Processing
```javascript
// Batch processing with Base64 encoding for large datasets
// Chunks of 1500 records to stay under Firestore 1MB limit
// 500ms delays between batches to prevent write stream overload
// Unicode-safe encoding: encodeURIComponent + btoa
const encodedCompanies = companies.map(company => {
  const jsonString = JSON.stringify(company);
  const uriEncoded = encodeURIComponent(jsonString);
  return btoa(uriEncoded);
});
```

### Cost-Optimized Audit Logging
```javascript
// Batch writes for cost efficiency (5 logs per batch)
// Skip low-value actions (view, filter, search)
// Sanitize data to minimize storage costs
// Batching with 1-second delay for efficiency
const auditBatchQueue = [];
const BATCH_SIZE = 5;
const BATCH_DELAY = 1000;
```

### Real-time Subscriptions
```javascript
// Use onSnapshot for real-time data updates
const unsubscribe = onSnapshot(
  query(collection(db, "leads"), orderBy("createdAt", "desc")),
  (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLeads(data);
  }
);
```

## UI/UX Patterns

### Responsive Design
```jsx
// Mobile-first responsive classes with Tailwind
className="min-h-screen flex bg-gray-50"
className={`grow transition-all duration-300 ease-in-out min-h-screen
  ${sidebarCollapsed ? 'ml-0 lg:ml-16' : 'ml-0 lg:ml-36'}`}
```

### Loading States
```jsx
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
  );
);
```

### Financial Components
```jsx
// Currency formatting with Indian Rupee
const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;

// Progress bars for financial metrics
<div className="w-full bg-slate-100 rounded-full h-1">
  <div
    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
    style={{ width: `${(value / total) * 100}%` }}
  ></div>
</div>
```

### Toast Notifications
```jsx
// Consistent toast configuration across the app
<ToastContainer
  position="bottom-right"
  autoClose={5000}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
  theme="colored"
/>
```

## Build & Deployment

### Vite Configuration
```javascript
// Manual chunking for optimal bundle splitting
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['@mui/material', '@mui/icons-material'],
  'firebase-vendor': ['firebase'],
  // ... additional vendor chunks
}
```

### Vercel Deployment
```json
{
  "installCommand": "npm install --legacy-peer-deps",
  "rewrites": [{ "source": "/:path*", "destination": "/index.html" }]
}
```

## Development Workflow

### Code Quality
- ESLint with React hooks rules enabled
- No unused variables (except constants starting with uppercase)
- React refresh for hot reloading

### Common Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

### Environment Variables
- `import.meta.env.PROD` for environment detection
- MSAL config switches between localhost and production URLs

## Role-Based Features

### Navigation Access Control
```javascript
// Role-based sidebar links in Sidebar.jsx
const roleLinks = {
  admin: [/* all modules */],
  sales: ["sales"],
  hr: ["hr", "purchase"],
  // ... role-specific access
}
```

### Department Context
```javascript
// Users have both role and departments array
user: {
  role: "sales",
  departments: ["sales", "marketing"],
  reportingManager: "manager@example.com"
}
```

### Budget Components by Department
```javascript
// Department-specific budget component types
const budgetComponents = {
  sales: {
    emails: "Email Subscriptions",
    laptops: "Laptops & Hardware",
    tshirts: "T-shirts",
    // ... department-specific items
  },
  // ... other departments
}
```

## Connection & Error Handling

### Connection Monitoring
```javascript
// Real-time connection status tracking
// Automatic retry logic for failed Firebase operations
// Connection check every 30 seconds
// Force connection check with manual retry
```

### Rate Limiting
```javascript
// 30 requests per minute for Firebase free tier
// Exponential backoff for retries (1s, 2s, 4s)
// Request timestamp tracking for rate limiting
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
```

## Performance Considerations

### Connection Monitoring
- Real-time connection status tracking
- Automatic retry logic for failed Firebase operations
- Rate limiting (30 requests/minute for free tier)

### Bundle Optimization
- Lazy loading for route components
- Vendor chunk splitting
- Debounced search/filter operations

### Memoization Strategy
- React.memo for component memoization
- useMemo for expensive calculations
- useCallback for stable function references
- Performance monitoring with console.time/timeEnd

## Notification System

### Ticket Alerts
```javascript
// Real-time ticket status monitoring
// Dismissible notifications for resolved tickets
// Context-based notification management
const { ticketAlerts, dismissAlert } = useNotifications();
```

## Common Patterns to Follow

1. **Always wrap new components with ErrorBoundary**
2. **Use safeFirebaseQuery for all Firestore operations**
3. **Implement loading states for async operations**
4. **Follow lazy loading pattern for heavy components**
5. **Use role-based access control for new features**
6. **Add audit logging for user actions**
7. **Test Excel upload patterns for large datasets**
8. **Maintain responsive design with Tailwind classes**
9. **Apply React.memo for performance-critical components**
10. **Use cost-optimized audit logging with batching**

## File Naming Conventions
- Components: `PascalCase.jsx`
- Utilities: `camelCase.js`
- Pages: `PascalCase.jsx`
- Contexts: `PascalCase.jsx`

## Testing Approach
- Manual testing with real Firebase data
- Component-level validation through UI interaction
- Error boundary testing for edge cases
- Excel upload testing with large datasets

## Deployment Checklist
- [ ] Update MSAL redirect URIs for production
- [ ] Implement proper Firestore security rules
- [ ] Configure Firebase indexes for complex queries
- [ ] Test all role-based access controls
- [ ] Verify lazy loading works in production
- [ ] Check bundle sizes and optimize if needed</content>
<parameter name="filePath">c:\Users\AjayPawar\Desktop\code\deep-crm\gryphon_crm\.github\copilot-instructions.md