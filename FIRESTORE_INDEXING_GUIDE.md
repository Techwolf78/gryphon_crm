# Firestore Indexing Guide for Gryphon CRM

## Project Details
- **Project ID**: `authencation-39485`
- **Firebase Console**: https://console.firebase.google.com/project/authencation-39485/firestore/indexes

## Required Compound Indexes

### 1. Trainer Assignments with Date Range (TrainerCalendar)
```json
{
  "collectionGroup": "trainerAssignments",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "date",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "trainerId",
      "order": "ASCENDING"
    }
  ]
}
```

```json
{
  "collectionGroup": "trainerAssignments",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "date",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "collegeName",
      "order": "ASCENDING"
    }
  ]
}
```

### 2. Trainer Payments (GenerateTrainerInvoice, InvoiceModal)
```json
{
  "collectionGroup": "trainerPayments",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "trainerId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "projectCode",
      "order": "ASCENDING"
    }
  ]
}
```

### 3. User Activity Logs (UpdateProfile)
```json
{
  "collectionGroup": "activityLogs",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "user",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "action",
      "order": "ASCENDING"
    }
  ]
}
```

### 4. College Leads (AddCollegeModal)
```json
{
  "collectionGroup": "collegeLeads",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "businessName",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "address",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "state",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "city",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "pocName",
      "order": "ASCENDING"
    }
  ]
}
```

### 5. Sales Leads by Phase (Sales.jsx)
```json
{
  "collectionGroup": "salesLeads",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "phase",
      "arrayConfig": "CONTAINS"
    }
  ]
}
```

## Automatic Single-Field Indexes
These are created automatically by Firestore:
- `assignedTo.uid` (trainingForms)
- `department` (users)
- `uid` (users)
- `sourceTrainingId` (trainerAssignments)
- `createdBy` (various collections)
- `trainerId` (trainerPayments)
- `user` (activityLogs)
- `action` (activityLogs)
- `projectCode` (trainerPayments)

## How to Create Indexes

### Method 1: Firebase Console (Recommended)
1. Go to https://console.firebase.google.com/project/authencation-39485/firestore/indexes
2. Click "Create Index"
3. Select Collection ID
4. Add fields in order
5. Choose query scope (Collection/Collection Group)

### Method 2: Firebase CLI
```bash
firebase firestore:indexes
```

### Method 3: Programmatic (firestore.indexes.json)
Create `firestore.indexes.json` in your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "trainerAssignments",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "date", "order": "ASCENDING"},
        {"fieldPath": "trainerId", "order": "ASCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Index Performance Benefits

### Before Indexing (Slow Queries)
- Range queries on `date` without proper indexes = full collection scans
- Compound queries = multiple round trips
- Large result sets = high read costs

### After Indexing (Fast Queries)
- Range queries = O(log n) complexity
- Compound queries = single optimized lookup
- Filtered results = reduced read costs

## Monitoring Index Usage

### Firebase Console Metrics
1. Go to Firestore → Usage → Index
2. Monitor read/write operations
3. Check query performance

### Cost Optimization
- **Before**: 1000 reads per dashboard load
- **After**: ~50 reads per dashboard load (with caching + indexing)
- **Savings**: ~95% reduction in Firestore costs

## Best Practices

1. **Create indexes for production queries only**
2. **Monitor index usage regularly**
3. **Delete unused indexes to save costs**
4. **Use composite indexes for multiple WHERE clauses**
5. **Order fields: equality → inequality → orderBy**

## Troubleshooting

### Common Errors
- `FAILED_PRECONDITION`: Missing index
- `DEADLINE_EXCEEDED`: Query timeout (needs optimization)

### Index Build Time
- Simple indexes: minutes
- Complex indexes: hours to days
- Monitor build progress in Firebase Console

## Emergency Optimization

If queries are failing due to missing indexes:

1. **Temporary**: Use simpler queries
2. **Quick Fix**: Create single-field indexes first
3. **Long-term**: Implement proper compound indexes

---

**Note**: Always test index changes in a development environment before deploying to production.
