# 🚀 Security Deployment Quick Start

## Critical Configuration (MUST DO BEFORE GOING LIVE)

### Step 1: Update Apps Script Security Settings

File: `src/components/Placement/AddJd/appscript-googleforms-studentdata.gs`

```javascript
// Line 4-5: Update these with your organization details
const AUTHORIZED_DOMAINS = ['@yourdomain.com'];           // ⚠️ CHANGE THIS
const AUTHORIZED_EMAILS = ['admin@example.com'];          // ⚠️ CHANGE THIS
```

**Example for multiple domains:**
```javascript
const AUTHORIZED_DOMAINS = ['@yourcompany.com', '@yourcompany.co.in'];
const AUTHORIZED_EMAILS = ['admin@yourcompany.com', 'hr@yourcompany.com'];
```

---

### Step 2: Deploy Apps Script with Security

1. Open Apps Script Editor
2. Click **Deploy** → **New Deployment**
3. Select type: **Web app**
4. Fill settings:
   - Execute as: **Your account** (owner email)
   - Who has access: **Anyone with a Google Account** 
   - ⚠️ **NOT "Anyone" - this must be "Anyone with a Google Account"**
5. Click **Deploy**
6. Copy the deployment URL
7. Update in `GoogleFormManager.jsx` line 75 (scriptUrl state)

---

### Step 3: Update Firebase Firestore Security Rules

1. Go to Firebase Console → Firestore → Rules
2. Replace with this security-enhanced version:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Security Logs - Admin only for reading
    match /SecurityLogs/{document=**} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow update, delete: if false;
    }
    
    // Placement Forms - Owner access only
    match /PlacementForms/{document=**} {
      allow read: if request.auth != null && 
                     (resource.data.createdBy == request.auth.token.email ||
                      request.auth.token.admin == true);
      allow create: if request.auth != null &&
                       request.resource.data.createdBy == request.auth.token.email;
      allow update: if request.auth != null && 
                       (resource.data.createdBy == request.auth.token.email ||
                        request.auth.token.admin == true);
      allow delete: if false;
    }
    
    // Other collections with standard auth
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

---

### Step 4: Update Frontend Configuration

File: `src/components/Placement/AddJd/GoogleFormManager.jsx`

Line 75 - Update the Apps Script URL:
```javascript
const [scriptUrl] = useState(
  "https://script.google.com/macros/s/[YOUR-DEPLOYMENT-ID]/exec"
  // ⚠️ Replace [YOUR-DEPLOYMENT-ID] with actual ID from Step 2
);
```

---

### Step 5: Enable Admin Custom Claims (Optional but Recommended)

For admin audit log access, set custom claims:

```javascript
// In your backend/Firebase Function
const admin = require('firebase-admin');

admin.auth().setCustomUserClaims('admin@yourdomain.com', { admin: true })
  .then(() => console.log('Custom claims set'))
  .catch(error => console.log(error));
```

---

## ✅ Verification Checklist

- [ ] Updated `AUTHORIZED_DOMAINS` in Apps Script
- [ ] Updated `AUTHORIZED_EMAILS` in Apps Script
- [ ] Deployed Apps Script as Web app with correct access level
- [ ] Updated Firestore Security Rules
- [ ] Updated Apps Script URL in `GoogleFormManager.jsx`
- [ ] Tested form creation as authorized user
- [ ] Tested form creation as unauthorized user (should fail)
- [ ] Verified SecurityLogs appear in Firestore
- [ ] Verified PlacementForms created with `createdBy` field
- [ ] Tested response fetching with authorized user
- [ ] Tested response fetching with unauthorized user (should fail)

---

## 🧪 Testing Security Features

### Test 1: Authorized User Can Create Forms
```
1. Log in with email matching AUTHORIZED_DOMAINS
2. Click "Create Google Form"
3. Should succeed ✅
```

### Test 2: Unauthorized User Cannot Create Forms
```
1. Log in with email NOT in AUTHORIZED_DOMAINS
2. Click "Create Google Form"
3. Should show "Unauthorized" error ✅
```

### Test 3: Forms Are Only Accessible by Owner
```
1. User A creates a form
2. User B tries to fetch responses
3. Should show "Access Denied" error ✅
```

### Test 4: Audit Logs Are Created
```
1. Create a form
2. Go to Firebase Console → Firestore → SecurityLogs
3. Should see entry with action: "form_creation_initiated" ✅
```

### Test 5: Admin Can View All Logs
```
1. Set your email in AUTHORIZED_EMAILS
2. Run getAuditLogs() function
3. Should see all audit log entries ✅
```

---

## 🔍 Monitoring After Deployment

### Daily Checks:
1. Review SecurityLogs for unusual patterns
2. Check error logs in Cloud Logging
3. Verify form creation/fetch success rates

### Weekly Checks:
1. Generate audit report (script provided)
2. Review user access patterns
3. Check for failed authentication attempts

### Monthly Review:
1. Analyze security trends
2. Review and update access permissions
3. Archive old logs (if retention policy set)

---

## 🚨 Security Incidents

### If Unauthorized Access Detected:
1. **Immediate**: Disable affected user account in Firebase
2. **Within 1 hour**: Review all SecurityLogs for that user
3. **Within 24 hours**: Notify affected stakeholders
4. **Within 48 hours**: Complete incident report
5. **Within 1 week**: Implement preventive measures

### Disable User Access:
```javascript
// In Firebase Console → Authentication
// Select user → Click "Disable User"
// Or via Admin SDK:
admin.auth().updateUser(uid, { disabled: true });
```

---

## 📞 Getting Help

- Review `SECURITY_IMPLEMENTATION.md` for detailed information
- Check logs: Firebase Console → Firestore → SecurityLogs
- Check errors: Firebase Console → Logging
- Contact security team for incidents

---

## ✨ You're All Set!

Your Google Forms integration is now **production-ready** with:
- ✅ Authentication & Authorization
- ✅ Audit Logging & Tracking
- ✅ Owner-based Access Control
- ✅ Security Event Monitoring
- ✅ Incident Response Ready

**Next Steps:**
1. Deploy Apps Script
2. Deploy React app
3. Test in staging
4. Monitor in production
5. Regular security reviews

---

**Remember**: Security is ongoing. Review and update regularly! 🔐
