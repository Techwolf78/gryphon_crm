# 🔐 Complete Security Setup Guide

## Table of Contents
1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [Apps Script Configuration](#apps-script-configuration)
3. [Firebase Configuration](#firebase-configuration)
4. [Frontend Configuration](#frontend-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Ongoing Maintenance](#ongoing-maintenance)

---

## Pre-Deployment Setup

### Required Information to Gather:
- [ ] Organization domain (e.g., `yourdomain.com`)
- [ ] Admin email addresses
- [ ] Apps Script deployment URL
- [ ] Firebase project ID
- [ ] Firestore database name

### Create a Deployment Checklist:
- [ ] Staging environment tested
- [ ] Security rules reviewed
- [ ] Authorized users defined
- [ ] Monitoring configured
- [ ] Admin procedures documented

---

## Apps Script Configuration

### Step 1: Locate Configuration Constants

File: `src/components/Placement/AddJd/appscript-googleforms-studentdata.gs`

Lines 4-5:
```javascript
const AUTHORIZED_DOMAINS = ['@yourdomain.com']; // ⚠️ UPDATE THIS
const AUTHORIZED_EMAILS = [];                   // ⚠️ UPDATE THIS
```

### Step 2: Update Authorized Domains

**Single Domain:**
```javascript
const AUTHORIZED_DOMAINS = ['@mycompany.com'];
```

**Multiple Domains:**
```javascript
const AUTHORIZED_DOMAINS = ['@mycompany.com', '@mycompany.co.in', '@subsidiary.com'];
```

### Step 3: Update Authorized Emails (Optional)

**For specific admin access:**
```javascript
const AUTHORIZED_EMAILS = [
  'admin@mycompany.com',
  'security@mycompany.com'
];
```

### Step 4: Deploy Apps Script

1. Open Google Apps Script
2. Copy entire content from `appscript-googleforms-studentdata.gs`
3. Paste into Apps Script editor
4. Click **Deploy** → **New Deployment**
5. Settings:
   - Type: **Web app**
   - Execute as: **Your account** (must be company account)
   - Who has access: **Anyone with a Google Account** (NOT "Anyone")
6. Click **Deploy**
7. **Copy the Deployment URL** - You'll need this!

Example URL:
```
https://script.google.com/macros/s/AKfycbzb7l7EzVg6pzTNy62pOdKzOv_tLiPXuxe-pDLeTGInhZ13r7hDM-2Ql8EBvyT7NbG2/exec
```

---

## Firebase Configuration

### Step 1: Set Up Firestore Collections

1. Go to Firebase Console
2. Select your project
3. Go to Firestore Database
4. Create Collections (if not exist):
   - `PlacementForms` - for form metadata
   - `SecurityLogs` - for audit logs

### Step 2: Update Security Rules

1. Go to Firestore → Rules
2. Click **Edit Rules**
3. Replace entire content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Security Logs - Write always, Read only for admins
    match /SecurityLogs/{document=**} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow update, delete: if false;
    }
    
    // Placement Forms - Owner access + admin override
    match /PlacementForms/{document=**} {
      allow read: if request.auth != null && 
                     (resource.data.createdBy == request.auth.token.email ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      
      allow create: if request.auth != null &&
                       request.resource.data.createdBy == request.auth.token.email;
      
      allow update: if request.auth != null && 
                       (resource.data.createdBy == request.auth.token.email ||
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      
      allow delete: if false; // Soft delete only via status field
    }
    
    // Users collection for admin tracking
    match /users/{userId} {
      allow read: if request.auth.uid == userId ||
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow write: if false; // Set via Admin SDK only
    }
    
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. Click **Publish**

### Step 3: Enable Firebase Authentication

1. Go to Firebase Console → Authentication
2. Click **Set up sign-in method**
3. Enable **Google** (should be enabled by default)
4. Configure authorized domains:
   - Click **Authorized domains**
   - Add: `localhost:3000`, `yourdomain.com`, other production domains

---

## Frontend Configuration

### Step 1: Update Apps Script URL

File: `src/components/Placement/AddJd/GoogleFormManager.jsx`

Line ~75:
```javascript
const [scriptUrl] = useState(
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
  // ⚠️ Replace YOUR_DEPLOYMENT_ID with actual ID from Apps Script deployment
);
```

### Step 2: Verify Firebase Import

Ensure Firebase is imported with `auth`:
```javascript
import { db, auth } from "../../../firebase";
```

### Step 3: Environment Variables (Optional)

For better security, use environment variables:

Create `.env.local`:
```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
VITE_FIREBASE_CONFIG={"apiKey":"...","projectId":"..."}
```

Update component:
```javascript
const [scriptUrl] = useState(import.meta.env.VITE_APPS_SCRIPT_URL);
```

---

## Deployment Steps

### Pre-Deployment Verification:

1. **Test in Staging**
   ```bash
   npm run dev
   # Test form creation and response fetch with test users
   ```

2. **Run Security Checklist**
   - [ ] Authorized domains configured
   - [ ] Authorized emails configured (if using)
   - [ ] Firestore rules published
   - [ ] Apps Script URL updated
   - [ ] Firebase auth configured
   - [ ] No hardcoded secrets in code

3. **Test With Unauthorized User**
   ```
   1. Log out
   2. Log in with unauthorized email
   3. Try to create form
   4. Verify: "Unauthorized" error appears
   ```

### Production Deployment:

1. **Build Production Bundle**
   ```bash
   npm run build
   ```

2. **Deploy to Production**
   ```bash
   # Using Vercel (if configured)
   vercel --prod
   
   # Or your deployment platform
   ```

3. **Verify Deployment**
   - [ ] Site accessible
   - [ ] Forms can be created
   - [ ] Responses can be fetched
   - [ ] SecurityLogs populated

4. **Enable Monitoring**
   - Set up Firebase alerts
   - Configure log exports
   - Test admin access to logs

---

## Post-Deployment Testing

### Test 1: Authorized User Access
```
Steps:
1. Log in with authorized email (your company domain)
2. Navigate to form creation
3. Create a test form
4. Try to fetch responses

Expected Results:
✅ Form created successfully
✅ Responses fetched without errors
✅ Entry in SecurityLogs with success status
```

### Test 2: Unauthorized User Rejection
```
Steps:
1. Create test user with non-authorized email
2. Log in as test user
3. Try to create form

Expected Results:
✅ Receives "Unauthorized" error
✅ Form not created
✅ Entry in SecurityLogs with error status
```

### Test 3: Form Access Control
```
Steps:
1. User A creates a form
2. Log out
3. Log in as User B
4. Get the form ID from User A's form
5. Try to access responses

Expected Results:
✅ User B denied access
✅ Error: "You do not have access to this form"
✅ Attempt logged in SecurityLogs
```

### Test 4: Audit Log Access
```
Steps:
1. Admin logs in
2. Go to Firebase Console → Firestore → SecurityLogs
3. Review recent entries

Expected Results:
✅ See entries with timestamps
✅ See user emails
✅ See event types (creation, fetch, etc.)
✅ See success/failure status
```

### Test 5: Error Handling
```
Steps:
1. Disable internet connection
2. Try to fetch responses
3. Re-enable connection

Expected Results:
✅ Appropriate error message
✅ No duplicate logs
✅ User can retry successfully
```

---

## Ongoing Maintenance

### Daily Tasks (5 min):
- [ ] Check for error alerts
- [ ] Verify form creation success rate

### Weekly Tasks (15 min):
- [ ] Review SecurityLogs for patterns
- [ ] Check for unauthorized access attempts
- [ ] Verify admin users can access logs

### Monthly Tasks (1 hour):
- [ ] Generate security report
- [ ] Review access patterns
- [ ] Update authorized users if needed
- [ ] Archive old security logs (if using)

### Quarterly Tasks (2 hours):
- [ ] Full security audit
- [ ] Update security documentation
- [ ] Review and update access controls
- [ ] Test incident response procedures

---

## Monitoring & Alerting

### Set Up Firebase Alerts:

1. Go to Firebase Console → Alerts
2. Create alerts for:
   - **High error rate** on responses endpoint
   - **Unusual authentication failures**
   - **Large data exports** (possible breach)

### Query Security Events:

```javascript
// Find all failed authentications
db.collection('SecurityLogs')
  .where('eventType', '==', 'response_fetch_failed')
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get()

// Find all activities by specific user
db.collection('SecurityLogs')
  .where('userEmail', '==', 'user@company.com')
  .orderBy('timestamp', 'desc')
  .get()

// Find all activities in time period
db.collection('SecurityLogs')
  .where('timestamp', '>=', startDate)
  .where('timestamp', '<=', endDate)
  .orderBy('timestamp', 'desc')
  .get()
```

---

## Troubleshooting Deployment

### Issue: "Unauthorized: Please log in with an authorized account"

**Cause**: User not in authorized domain
**Solution**:
1. Verify email domain matches `AUTHORIZED_DOMAINS`
2. Check Apps Script updated with correct domain
3. User must log out and back in

### Issue: "Failed to connect to Apps Script"

**Cause**: Apps Script URL incorrect or not deployed
**Solution**:
1. Verify URL in GoogleFormManager.jsx is correct
2. Re-deploy Apps Script if URL missing
3. Check internet connection

### Issue: SecurityLogs not showing

**Cause**: Firebase not configured or user not authenticated
**Solution**:
1. Verify `auth.currentUser` exists
2. Check Firestore rules allow writes to SecurityLogs
3. Check browser console for errors

### Issue: "You do not have access to this form"

**Cause**: User trying to access form they didn't create
**Solution**:
1. Verify form ID is correct
2. Check that user created the form (should own it)
3. Contact form owner for access

---

## Security Compliance

### GDPR Compliance:
- ✅ User consent for data collection
- ✅ Data retention policies
- ✅ Right to access (admin function)
- ✅ Right to deletion (soft delete via status)

### SOC 2 Compliance:
- ✅ Access controls
- ✅ Audit logging
- ✅ Encryption in transit (HTTPS)
- ✅ Data segregation

### Data Sensitivity:
- ✅ Student data access restricted
- ✅ Only owners can view
- ✅ All access logged
- ✅ Audit trail immutable

---

## Emergency Procedures

### If Breach Detected:

1. **Immediate (5 min)**
   - Disable affected user account
   - Stop form creation/response access
   - Alert security team

2. **Within 1 hour**
   - Review SecurityLogs for affected forms
   - Identify compromised data
   - Notify affected students/staff

3. **Within 24 hours**
   - Complete incident analysis
   - Update access controls
   - Reset affected user credentials

4. **Within 1 week**
   - Incident report completed
   - Preventive measures implemented
   - Notify relevant authorities if required

---

## Support & Documentation

- **Quick Reference**: See `SECURITY_DEPLOYMENT_QUICKSTART.md`
- **Implementation Details**: See `SECURITY_IMPLEMENTATION.md`
- **Change Summary**: See `SECURITY_CHANGES_SUMMARY.md`

---

## Checklist Before Going Live

- [ ] Apps Script configured with correct domains
- [ ] Apps Script deployed as Web app
- [ ] Firestore security rules published
- [ ] Frontend Apps Script URL updated
- [ ] Firebase authentication enabled
- [ ] Environment variables configured
- [ ] Staging tests passed
- [ ] Unauthorized access rejected
- [ ] Audit logs working
- [ ] Admin can view logs
- [ ] Monitoring configured
- [ ] Backup procedures in place
- [ ] Incident response plan documented
- [ ] Staff trained on security procedures
- [ ] Go/No-Go decision made

---

## Go Live Confirmation

**Date**: _______________  
**Tested By**: _______________  
**Approved By**: _______________  
**Status**: ✅ Ready for Production

---

**Remember**: Security is not a one-time task. Regular monitoring and updates are essential! 🔐
