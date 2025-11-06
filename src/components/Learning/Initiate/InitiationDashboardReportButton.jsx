import React, { useState, useEffect, useRef } from 'react';
import { FiDownload, FiCalendar, FiChevronDown } from 'react-icons/fi';
import * as XLSX from 'xlsx-js-style';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

const InitiationDashboardReportButton = ({ trainings }) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showFullExportSubmenu, setShowFullExportSubmenu] = useState(false);
  const [showRangeExportSubmenu, setShowRangeExportSubmenu] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportOptions(false);
        setShowFullExportSubmenu(false);
        setShowRangeExportSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExportReport = () => {
    setShowExportOptions(!showExportOptions);
  };

  const handleFullExport = () => {
    setShowFullExportSubmenu(!showFullExportSubmenu);
  };

  const handleRangeExport = () => {
    setShowRangeExportSubmenu(!showRangeExportSubmenu);
  };

  const handlePhaseExport = async () => {
    setShowExportOptions(false);
    setShowFullExportSubmenu(false);
    await processExportReport(trainings);
  };

  const handleCollegeReport = async () => {
    setShowExportOptions(false);
    setShowFullExportSubmenu(false);
    await processCollegeReport(trainings);
  };

  const handleDateRangePhaseExport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    if (startDate > endDate) {
      alert('Start date cannot be after end date');
      return;
    }

    setShowExportOptions(false);
    setShowRangeExportSubmenu(false);

    // Filter trainings based on date range
    const filteredTrainings = trainings.filter(training => {
      if (!training.trainingStartDate || !training.trainingEndDate) return false;
      
      const trainingStart = new Date(training.trainingStartDate);
      const trainingEnd = new Date(training.trainingEndDate);
      
      // Check if training dates overlap with selected date range
      return trainingStart <= endDate && trainingEnd >= startDate;
    });

    if (filteredTrainings.length === 0) {
      alert('No trainings found within the selected date range');
      return;
    }

    // Use filtered trainings for phase export
    await processExportReport(filteredTrainings);
  };

  const handleDateRangeCollegeExport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    if (startDate > endDate) {
      alert('Start date cannot be after end date');
      return;
    }

    setShowExportOptions(false);
    setShowRangeExportSubmenu(false);

    // Filter trainings based on date range
    const filteredTrainings = trainings.filter(training => {
      if (!training.trainingStartDate || !training.trainingEndDate) return false;
      
      const trainingStart = new Date(training.trainingStartDate);
      const trainingEnd = new Date(training.trainingEndDate);
      
      // Check if training dates overlap with selected date range
      return trainingStart <= endDate && trainingEnd >= startDate;
    });

    if (filteredTrainings.length === 0) {
      alert('No trainings found within the selected date range');
      return;
    }

    // Use filtered trainings for college export
    await processCollegeReport(filteredTrainings);
  };

  const processCollegeReport = async (trainingsToExport) => {
    try {
      // Fetch detailed data for all trainings to get domain information and training form topics
      const detailedTrainings = await Promise.all(
        trainingsToExport.map(async (training) => {
          try {
            // Fetch phase data
            const phaseDocRef = doc(db, "trainingForms", training.trainingId, "trainings", training.phaseId);
            const phaseSnap = await getDoc(phaseDocRef);

            if (!phaseSnap.exists()) return null;

            const phaseData = phaseSnap.data();

            // Fetch training form data to get topics (planned hours)
            const trainingFormDocRef = doc(db, "trainingForms", training.trainingId);
            const trainingFormSnap = await getDoc(trainingFormDocRef);
            const trainingFormData = trainingFormSnap.exists() ? trainingFormSnap.data() : {};

            // Fetch domains data
            const domainsRef = collection(phaseDocRef, "domains");
            const domainsSnap = await getDocs(domainsRef);

            const domainsData = await Promise.all(
              domainsSnap.docs.map(async (domainDoc) => {
                const domainData = domainDoc.data();

                // Fetch batches data to get trainer hours
                const batchesRef = collection(domainDoc.ref, "batches");
                const batchesSnap = await getDocs(batchesRef);

                return {
                  id: domainDoc.id,
                  ...domainData,
                  batches: batchesSnap.docs.map(batchDoc => ({
                    id: batchDoc.id,
                    ...batchDoc.data()
                  }))
                };
              })
            );

            return {
              ...training,
              phaseData,
              trainingFormData,
              domainsData
            };
          } catch (error) {
            console.error('Error fetching training details:', error);
            return null;
          }
        })
      );

      // Filter out null results
      const validTrainings = detailedTrainings.filter(t => t !== null);

      // Group trainings by college and project code, aggregate domain-wise hours
      const collegeData = {};

      validTrainings.forEach(training => {
        const collegeName = training.collegeName || 'Unknown College';
        const projectCode = training.projectCode || training.collegeCode || '';
        const collegeKey = `${collegeName}|${projectCode}`;

        if (!collegeData[collegeKey]) {
          collegeData[collegeKey] = {
            sNo: Object.keys(collegeData).length + 1,
            collegeName,
            projectCode: projectCode, // Project Code (full project code)
            projectType: training.deliveryType || 'TP', // Project type (delivery type)
            startDate: training.trainingStartDate || '',
            domainHours: {}, // Store domain-wise planned hours from topics
            spentDomainHours: {}, // Store domain-wise actual spent hours
            totalHrsPerBatch: '', // Will be formatted as domain breakdown (planned)
            spentHrsPerDomain: '', // Will be formatted as domain breakdown (spent)
            pendingHrsPerDomain: '', // Will be formatted as domain breakdown (pending)
            batch: '',
            spentHoursPerBatch: 0,
            pendingProjectionHoursPerBatch: 0,
            totalHoursToBeGiven: 0,
            givenHours: 0,
            pending: 0,
            remarks: ''
          };
        }

        // Get planned hours from training form topics (sales team input)
        const topics = training.trainingFormData?.topics || [];
        topics.forEach(topic => {
          const topicName = (topic.topic || '').toLowerCase().trim();
          const topicHours = parseInt(topic.hours) || 0;

          // Categorize topic and add to college's domain hours
          let categoryName = 'Other';
          if (topicName.includes('soft skill') || topicName.includes('softskill') || topicName.includes('communication') || topicName.includes('leadership')) {
            categoryName = 'Soft Skills';
          } else if (topicName.includes('aptitude') || topicName.includes('quantitative') || topicName.includes('reasoning') || topicName.includes('lr qa')) {
            categoryName = 'Aptitude';
          } else if (topicName.includes('technical') || topicName.includes('domain technical') || topicName.includes('java') || topicName.includes('python') || topicName.includes('mechanical') || topicName.includes('civil') || topicName.includes('electrical')) {
            categoryName = 'Technical';
          } else if (topicName.includes('tool') || topicName.includes('excel') || topicName.includes('looker') || topicName.includes('studio') || topicName.includes('power bi') || topicName.includes('tableau')) {
            categoryName = 'Tools';
          }

          if (!collegeData[collegeKey].domainHours[categoryName]) {
            collegeData[collegeKey].domainHours[categoryName] = 0;
          }
          collegeData[collegeKey].domainHours[categoryName] += topicHours;
          collegeData[collegeKey].totalHoursToBeGiven += topicHours;
        });

        // Calculate actual spent hours per domain from trainer assignments
        training.domainsData.forEach(domain => {
          const domainName = (domain.domain || '').toLowerCase().trim();

          // Calculate total spent hours for this domain from all trainers
          let domainSpentHours = 0;
          domain.table1Data?.forEach(row => {
            row.batches?.forEach(batch => {
              batch.trainers?.forEach(trainer => {
                domainSpentHours += trainer.assignedHours || 0;
              });
            });
          });

          // Categorize domain and add to college's spent domain hours
          let categoryName = 'Other';
          if (domainName.includes('softskill') || domainName.includes('soft skill') || domainName.includes('communication') || domainName.includes('leadership')) {
            categoryName = 'Soft Skills';
          } else if (domainName.includes('aptitude') || domainName.includes('quantitative') || domainName.includes('reasoning') || domainName.includes('lr qa')) {
            categoryName = 'Aptitude';
          } else if (domainName.includes('technical') || domainName.includes('java') || domainName.includes('python') || domainName.includes('mechanical') || domainName.includes('civil') || domainName.includes('electrical')) {
            categoryName = 'Technical';
          } else if (domainName.includes('tool') || domainName.includes('excel') || domainName.includes('looker') || domainName.includes('studio') || domainName.includes('power bi') || domainName.includes('tableau')) {
            categoryName = 'Tools';
          }

          if (!collegeData[collegeKey].spentDomainHours[categoryName]) {
            collegeData[collegeKey].spentDomainHours[categoryName] = 0;
          }
          collegeData[collegeKey].spentDomainHours[categoryName] += domainSpentHours;
        });

        // Calculate batch information
        const trainingTotalHours = training.totaltraininghours || 0;

        // Calculate total batches across all domains in this training (same logic as spent hours)
        const totalBatchesInTraining = training.domainsData.reduce((sum, domain) => {
          let batchCount = 0;
          domain.table1Data?.forEach(row => {
            batchCount += row.batches?.length || 0;
          });
          return sum + batchCount;
        }, 0);

        // Use total planned hours for "Spent hours/Batch" column (what was previously in "Total Hrs to be given/Batch")
        collegeData[collegeKey].spentHoursPerBatch += trainingTotalHours;

        // Accumulate total batches across all trainings for this college
        collegeData[collegeKey].totalBatches = (collegeData[collegeKey].totalBatches || 0) + totalBatchesInTraining;

        // Set earliest start date
        if (!collegeData[collegeKey].startDate || (training.trainingStartDate && new Date(training.trainingStartDate) < new Date(collegeData[collegeKey].startDate))) {
          collegeData[collegeKey].startDate = training.trainingStartDate || '';
        }
      });      // Format domain hours as strings for each college
      Object.values(collegeData).forEach(college => {
        // Planned hours per domain
        const plannedStrings = Object.entries(college.domainHours)
          .filter(([, hours]) => hours > 0)
          .map(([domain, hours]) => `${domain}: ${hours}`)
          .join(', ');
        college.totalHrsPerBatch = plannedStrings || 'No domains';

        // Spent hours per domain
        const spentStrings = Object.entries(college.spentDomainHours)
          .filter(([, hours]) => hours > 0)
          .map(([domain, hours]) => `${domain}: ${hours}`)
          .join(', ');
        college.spentHrsPerDomain = spentStrings || 'No data';

        // Pending hours per domain (planned - spent)
        const pendingDomainHours = {};
        Object.keys(college.domainHours).forEach(domain => {
          const planned = college.domainHours[domain] || 0;
          const spent = college.spentDomainHours[domain] || 0;
          const pending = planned - spent;
          if (pending !== 0) {
            pendingDomainHours[domain] = pending;
          }
        });
        const pendingStrings = Object.entries(pendingDomainHours)
          .map(([domain, hours]) => `${domain}: ${hours}`)
          .join(', ');
        college.pendingHrsPerDomain = pendingStrings || 'No pending';

        // Calculate given hours as sum of all spent domain hours
        college.givenHours = Object.values(college.spentDomainHours).reduce((sum, hours) => sum + hours, 0);

        // Calculate pending hours as sum of all pending domain hours
        college.pending = Object.values(pendingDomainHours).reduce((sum, hours) => sum + hours, 0);

        // Format batch count
        college.batch = college.totalBatches > 0 ? `${college.totalBatches} batches` : 'No batches';
      });

      // Convert to array format for Excel
      const data = Object.values(collegeData).map(college => [
        college.sNo,
        college.collegeName,
        college.projectCode, // Project Code (delivery type)
        college.projectType,
        college.startDate ? new Date(college.startDate).toLocaleDateString('en-IN') : '',
        college.batch,
        college.totalHrsPerBatch, // Total Hrs to be given / Domain
        college.spentHrsPerDomain, // Total Spent hrs / domain
        college.pendingHrsPerDomain, // total pending / projection hours / domain
        college.totalHoursToBeGiven, // total hours to be given
        college.givenHours, // given hours
        college.pending, // pending hours
        college.remarks // remarks
      ]);

      // Headers
      const headers = [
        'S. No.',
        'College Name',
        'Project Code',
        'Project type',
        'Start Date',
        'Batch',
        'Total Hrs to be given / Domain',
        'Total Spent hrs / domain',
        'total pending / projection hours / domain',
        'total hours to be given',
        'given hours',
        'pending hours',
        'remarks'
      ];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // S. No.
        { wch: 25 },  // College Name
        { wch: 12 },  // Project Code
        { wch: 15 },  // Project type
        { wch: 12 },  // Start Date
        { wch: 12 },  // Batch
        { wch: 35 },  // Total Hrs to be given / Domain
        { wch: 35 },  // Total Spent hrs / domain
        { wch: 35 },  // total pending / projection hours / domain
        { wch: 18 },  // total hours to be given
        { wch: 12 },  // given hours
        { wch: 10 },  // pending hours
        { wch: 15 }   // remarks
      ];

      // Style headers
      const headerFillColor = 'CCECFF';
      headers.forEach((header, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: header };
        ws[cellRef].s = {
          font: { bold: true, sz: 11, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: headerFillColor } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };
      });

      // Style data cells
      const rowLight = 'FFFFFF';
      const rowDark = 'EEF6FF';
      const borderColor = 'D1D5DB';
      data.forEach((row, r) => {
        const isEvenRow = (r + 1) % 2 === 0;
        const fillColor = isEvenRow ? rowDark : rowLight;
        row.forEach((cell, c) => {
          const cellRef = XLSX.utils.encode_cell({ r: r + 1, c: c });
          if (!ws[cellRef]) ws[cellRef] = { v: cell };

          const isNumberColumn = c >= 9 && c <= 11; // Numeric columns (total hours, given hours, pending hours)
          ws[cellRef].s = {
            font: { sz: 9, color: { rgb: '111827' } },
            fill: { fgColor: { rgb: fillColor } },
            border: {
              top: { style: 'thin', color: { rgb: borderColor } },
              bottom: { style: 'thin', color: { rgb: borderColor } },
              left: { style: 'thin', color: { rgb: borderColor } },
              right: { style: 'thin', color: { rgb: borderColor } }
            },
            alignment: {
              horizontal: isNumberColumn ? 'right' : 'left',
              vertical: 'center',
              wrapText: true
            },
            numFmt: isNumberColumn ? '0.00' : undefined
          };
        });
      });

      // Freeze header row and first column
      ws['!freeze'] = { xSplit: 1, ySplit: 1 };

      // Add filters
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'College Report');

      // Export file
      XLSX.writeFile(wb, `college_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('College report export failed:', error);
      alert('Failed to export college report. Please try again.');
    }
  };

  const processExportReport = async (trainingsToExport) => {
    try {
      // Fetch detailed data for all trainings
      const detailedTrainings = await Promise.all(
        trainingsToExport.map(async (training) => {
          try {
            // Fetch phase data
            const phaseDocRef = doc(db, "trainingForms", training.trainingId, "trainings", training.phaseId);
            const phaseSnap = await getDoc(phaseDocRef);
            
            if (!phaseSnap.exists()) return null;
            
            const phaseData = phaseSnap.data();
            
            // Fetch domains data
            const domainsRef = collection(phaseDocRef, "domains");
            const domainsSnap = await getDocs(domainsRef);
            
            const domainsData = await Promise.all(
              domainsSnap.docs.map(async (domainDoc) => {
                const domainData = domainDoc.data();
                
                return {
                  id: domainDoc.id,
                  ...domainData
                };
              })
            );
            
            return {
              ...training,
              phaseData,
              domainsData
            };
          } catch (error) {
            console.error('Error fetching training details:', error);
            return null;
          }
        })
      );

      // Filter out null results
      const validTrainings = detailedTrainings.filter(t => t !== null);

      // Group trainings by college, project code, and phase, and calculate aggregated data
      const collegePhaseData = {};

      validTrainings.forEach(training => {
        const collegeName = training.collegeName || 'Unknown College';
        const projectCode = training.projectCode || training.collegeCode || '';
        const phaseId = training.phaseId || 'Unknown Phase';
        const phaseKey = `${collegeName}|${projectCode}|${phaseId}`;
        
        if (!collegePhaseData[phaseKey]) {
          collegePhaseData[phaseKey] = {
            collegeName,
            projectCode,
            projectType: training.deliveryType || 'TP',
            phaseId,
            softskillsHours: 0,
            aptitudeHours: 0,
            technicalHours: 0,
            toolsHours: 0,
            totalHours: 0,
            softskillsCost: 0,
            aptitudeCost: 0,
            technicalCost: 0,
            toolsCost: 0,
            miscCost: 0,
            totalCost: 0
          };
        }

        // Process each domain in this training
        training.domainsData.forEach(domain => {
          const domainName = (domain.domain || '').toLowerCase();
          
          // Calculate hours and costs from trainers
          let domainHours = 0;
          let domainTrainerCost = 0;
          let domainMiscCost = 0;
          
          domain.table1Data?.forEach(row => {
            row.batches?.forEach(batch => {
              batch.trainers?.forEach(trainer => {
                // Calculate training days - use trainer's specific dates
                const days = getTrainingDays(trainer.startDate, trainer.endDate, training.phaseData?.excludeDays || "None");
                
                // Calculate costs
                const conveyanceTotal = trainer.conveyance || 0;
                const foodTotal = (trainer.food || 0) * days;
                const lodgingTotal = (trainer.lodging || 0) * days;
                const trainerCost = (trainer.assignedHours || 0) * (trainer.perHourCost || 0);
                const miscTotal = conveyanceTotal + foodTotal + lodgingTotal;
                
                domainHours += trainer.assignedHours || 0;
                domainTrainerCost += trainerCost;
                domainMiscCost += miscTotal;
              });
            });
          });
          
          // Categorize based on domain name
          if (domainName.includes('softskill') || domainName.includes('soft skill') || domainName.includes('communication') || domainName.includes('leadership')) {
            collegePhaseData[phaseKey].softskillsHours += domainHours;
            collegePhaseData[phaseKey].softskillsCost += domainTrainerCost;
          } else if (domainName.includes('aptitude') || domainName.includes('quantitative') || domainName.includes('reasoning') || domainName.includes('lr qa')) {
            collegePhaseData[phaseKey].aptitudeHours += domainHours;
            collegePhaseData[phaseKey].aptitudeCost += domainTrainerCost;
          } else if (domainName.includes('technical') || domainName.includes('java') || domainName.includes('python') || domainName.includes('mechanical') || domainName.includes('civil') || domainName.includes('electrical')) {
            collegePhaseData[phaseKey].technicalHours += domainHours;
            collegePhaseData[phaseKey].technicalCost += domainTrainerCost;
          } else if (domainName.includes('tool') || domainName.includes('excel') || domainName.includes('looker') || domainName.includes('studio') || domainName.includes('power bi') || domainName.includes('tableau')) {
            collegePhaseData[phaseKey].toolsHours += domainHours;
            collegePhaseData[phaseKey].toolsCost += domainTrainerCost;
          } else {
            // If domain doesn't match any category, put trainer cost in misc cost
            collegePhaseData[phaseKey].miscCost += domainTrainerCost;
          }
          
          // Always add miscellaneous expenses (conveyance + food + lodging) to misc cost for ALL domains
          collegePhaseData[phaseKey].miscCost += domainMiscCost;
          
          // Always add to total
          collegePhaseData[phaseKey].totalHours += domainHours;
          collegePhaseData[phaseKey].totalCost += (domainTrainerCost + domainMiscCost);
        });
      });

      // Convert to array format for Excel and sort by college name, project code, and phase
      const data = Object.entries(collegePhaseData)
        .sort(([a], [b]) => {
          const [collegeA, projectA, phaseA] = a.split('|');
          const [collegeB, projectB, phaseB] = b.split('|');
          if (collegeA !== collegeB) return collegeA.localeCompare(collegeB);
          if (projectA !== projectB) return projectA.localeCompare(projectB);
          return phaseA.localeCompare(phaseB);
        })
        .map(([, data]) => [
          data.collegeName,
          data.projectCode,
          data.projectType,
          data.phaseId.replace('phase-', 'Phase '),
          data.softskillsHours,
          data.aptitudeHours,
          data.technicalHours,
          data.toolsHours,
          data.totalHours,
          data.softskillsCost,
          data.aptitudeCost,
          data.technicalCost,
          data.toolsCost,
          data.miscCost,
          data.totalCost
        ]);

      // Headers
      const headers = [
        'College',
        'Project Code',
        'Project type',
        'Phase',
        'Softskills Hours',
        'Aptitude Hours',
        'Technical Hours',
        'Tools Hours',
        'Total Hours',
        'Softskills Cost',
        'Aptitude Cost',
        'Technical Cost',
        'Tools Cost',
        'Mis. Cost',
        'Total Cost'
      ];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

      // Set column widths
      const maxLengths = headers.map((header, i) => {
        const headerLen = header.length;
        const dataLen = Math.max(...data.map(row => String(row[i] || '').length));
        return Math.max(headerLen, dataLen, 12);
      });
      ws['!cols'] = maxLengths.map(len => ({ wch: len + 2 }));

      // Style headers
      const headerFillColor = 'CCECFF';
      headers.forEach((header, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: header };
        ws[cellRef].s = {
          font: { bold: true, sz: 12, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: headerFillColor } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };
      });

      // Style data cells
      const rowLight = 'FFFFFF';
      const rowDark = 'EEF6FF';
      const borderColor = 'D1D5DB';
      data.forEach((row, r) => {
        const isEvenRow = (r + 1) % 2 === 0;
        const fillColor = isEvenRow ? rowDark : rowLight;
        row.forEach((cell, c) => {
          const cellRef = XLSX.utils.encode_cell({ r: r + 1, c: c });
          if (!ws[cellRef]) ws[cellRef] = { v: cell };

        // Format currency columns (indices 9-14 are cost columns)
        const isCurrencyColumn = c >= 9 && c <= 14;
        const isHoursColumn = c >= 4 && c <= 8;          ws[cellRef].s = {
            font: { sz: 10, color: { rgb: '111827' } },
            fill: { fgColor: { rgb: fillColor } },
            border: {
              top: { style: 'thin', color: { rgb: borderColor } },
              bottom: { style: 'thin', color: { rgb: borderColor } },
              left: { style: 'thin', color: { rgb: borderColor } },
              right: { style: 'thin', color: { rgb: borderColor } }
            },
            alignment: {
              horizontal: isCurrencyColumn || isHoursColumn ? 'right' : 'left',
              vertical: 'center',
              wrapText: true
            },
            numFmt: isCurrencyColumn ? '"₹"#,##0.00' : (isHoursColumn ? '0.00' : undefined)
          };
        });
      });

      // Freeze header row and first column
      ws['!freeze'] = { xSplit: 1, ySplit: 1 };

      // Add filters
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };

      // Add table
      try {
        const startRef = 'A1';
        const endRef = XLSX.utils.encode_cell({ r: data.length, c: headers.length - 1 });
        const tableRef = `${startRef}:${endRef}`;
        ws['!tables'] = [{ name: 'TrainingReportTable', ref: tableRef, headerRow: true }];
      } catch {
        // Non-critical
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Training Report');

      // Export file
      XLSX.writeFile(wb, `training_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  // Helper function to calculate training days
  const getTrainingDays = (startDate, endDate, excludeDays = "None") => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || end < start) return 0;
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      let shouldInclude = true;
      if (excludeDays === "Saturday" && dayOfWeek === 6) shouldInclude = false;
      else if (excludeDays === "Sunday" && dayOfWeek === 0) shouldInclude = false;
      else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) shouldInclude = false;
      if (shouldInclude) days++;
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleExportReport}
        className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-purple-500 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-1 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-white"
        aria-label="Export training report options"
      >
        <FiDownload className="mr-1 w-3 h-3" />
        <span className="hidden sm:inline">Report</span>
        <span className="sm:hidden">Rep</span>
        <FiChevronDown className="ml-1 w-3 h-3" />
      </button>

      {/* Export Options Dropdown */}
      {showExportOptions && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-10 border border-gray-200">
          {/* Full Export Section */}
          <div className="p-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Export</div>
            <div className="relative">
              <button
                onClick={handleFullExport}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-linear-to-r from-purple-600 to-purple-700 rounded-md hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all duration-200 shadow-sm"
              >
                <FiDownload className="mr-2 w-4 h-4" />
                Full Export
                <FiChevronDown className="ml-2 w-3 h-3" />
              </button>

              {/* Full Export Submenu */}
              {showFullExportSubmenu && (
                <div className="absolute left-0 top-0 -translate-x-full mr-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  <div className="py-1">
                    <button
                      onClick={handlePhaseExport}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                    >
                      <FiDownload className="mr-2 w-4 h-4" />
                      Phase Export
                    </button>
                    <button
                      onClick={handleCollegeReport}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                    >
                      <FiDownload className="mr-2 w-4 h-4" />
                      College Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Section */}
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Custom Range</div>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="relative">
                <button
                  onClick={handleRangeExport}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-linear-to-r from-green-600 to-green-700 rounded-md hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm"
                >
                  <FiDownload className="mr-2 w-4 h-4" />
                  Export Range
                  <FiChevronDown className="ml-2 w-3 h-3" />
                </button>

                {/* Range Export Submenu */}
                {showRangeExportSubmenu && (
                  <div className="absolute left-0 top-0 -translate-x-full mr-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    <div className="py-1">
                      <button
                        onClick={handleDateRangePhaseExport}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                      >
                        <FiDownload className="mr-2 w-4 h-4" />
                        Phase Export
                      </button>
                      <button
                        onClick={handleDateRangeCollegeExport}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                      >
                        <FiDownload className="mr-2 w-4 h-4" />
                        College Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InitiationDashboardReportButton;