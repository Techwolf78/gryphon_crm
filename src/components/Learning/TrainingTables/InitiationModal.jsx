import React, { useState, useEffect } from 'react';
import PhaseSelection from '../../../components/Learning/TrainingTables/Initiate/PhaseSelector';
import CommonFields from '../../../components/Learning/TrainingTables/Initiate/CommonDetailsForm';
import BatchDetailsTable from '../../../components/Learning/TrainingTables/Initiate/BatchDetailsTable';
import TrainingScheduleTable from '../../../components/Learning/TrainingTables/Initiate/TrainingScheduleTalbe';
import Phase2Dates from '../../../components/Learning/TrainingTables/Initiate/Phase2Dates';
import { db } from '../../../firebase';
import { doc, collection, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const PHASE_OPTIONS = ['phase-1', 'phase-2'];
const DOMAIN_OPTIONS = ['Technical', 'Soft skills', 'Aptitude', 'Tools'];

function InitiationModal({ training, onClose, onConfirm }) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);

  const [commonFields, setCommonFields] = useState({
    trainingStartDate: null,
    trainingEndDate: null,
    collegeStartTime: '',
    collegeEndTime: '',
    lunchTime: ''
  });

  const [phase2Dates, setPhase2Dates] = useState({
    startDate: null,
    endDate: null
  });

  const [table1Data, setTable1Data] = useState([]);
  const [table2Data, setTable2Data] = useState([
    {
      batchCode: '',
      startDate: null,
      endDate: null,
      trainerName: '',
      dayDuration: '',
      cost: '',
      travelFoodStay: '',
      totalAmount: '',
      totalHours: '',
      remainingHrs: ''
    }
  ]);

  // 👇 Fetch training form details (topics + courses)
  useEffect(() => {
    const fetchTrainingDetails = async () => {
      if (!training?.id) return;
      const docRef = doc(db, 'trainingForms', training.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setTopics(data.topics || []);
        setCourses(data.courses || []);
      }
    };
    fetchTrainingDetails();
  }, [training]);

  // 👇 Generate table1Data when selectedDomain or courses change
  useEffect(() => {
    if (selectedDomain && courses.length > 0) {
      const domainTopic = topics.find(t => t.topic === `Domain ${selectedDomain}`);
      const domainHours = domainTopic?.hours || 0;


      const rows = courses.map(course => ({
        batch: course.specialization,
        stdCount: course.students,
        hrs: course.hours || domainHours,
        batchPerStdCount: '',
        batchCode: generateBatchCode(course.specialization),
        assignedHours: '',
        batches: [
          {
            batchPerStdCount: '',
            batchCode: `${course.specialization}1`
          }
        ]
      }));
      setTable1Data(rows);
    } else {
      setTable1Data([]);
    }
  }, [selectedDomain, courses, topics]);

  const generateBatchCode = (specialization) => {
    if (!training?.collegeCode || !training?.year) return '';
    return `${training.collegeCode}-${specialization}-${training.year}`;
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhases(prev =>
      prev.includes(phase)
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );

    if (phase === 'phase-1' && !selectedPhases.includes(phase)) {
      setSelectedDomain('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedPhases.length === 0) {
      setError('Please select at least one phase');
      return;
    }

    if (selectedPhases.includes('phase-1') && !selectedDomain) {
      setError('Please select a domain for phase 1');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const batchPromises = selectedPhases.map(async (phase) => {
        const phaseData = {
          details,
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          ...commonFields,
          table1Data,
          table2Data,
        };

        if (phase === 'phase-1') {
          phaseData.domain = selectedDomain;
        }

        if (phase === 'phase-2') {
          phaseData.phase2Dates = phase2Dates;
        }

        const phaseRef = doc(
          collection(db, 'trainingForms', training.id, 'trainings'),
          phase
        );

        return setDoc(phaseRef, phaseData);
      });

      await Promise.all(batchPromises);

      setLoading(false);
      if (onConfirm) onConfirm({
        phases: selectedPhases,
        details,
        ...commonFields,
        domain: selectedDomain,
        table1Data,
        table2Data,
        ...phase2Dates
      });

      if (onClose) onClose();
    } catch (err) {
      console.error('Error saving phase data:', err);
      setError('Failed to save phase data');
      setLoading(false);
    }
  };

  // Add Batch handler for Phase 2
  const addBatch = () => {
    setTable2Data([
      ...table2Data,
      { 
        batchCode: '', 
        startDate: null, 
        endDate: null, 
        trainerName: '', 
        dayDuration: '', 
        cost: '', 
        travelFoodStay: '', 
        totalAmount: '', 
        totalHours: '', 
        remainingHrs: '' 
      }
    ]);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-500 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl my-8 max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Initiate Training Phase</h2>
        <form onSubmit={handleSubmit}>
          <PhaseSelection
            phases={PHASE_OPTIONS}
            selectedPhases={selectedPhases}
            onChange={handlePhaseChange}
          />

          {(selectedPhases.includes('phase-1') || selectedPhases.includes('phase-2')) && (
            <>
              <CommonFields
                commonFields={commonFields}
                setCommonFields={setCommonFields}
                selectedDomain={selectedDomain}
                setSelectedDomain={setSelectedDomain}
                domainOptions={DOMAIN_OPTIONS}
              />

              {selectedDomain && (
                <>
                  <BatchDetailsTable
                    table1Data={table1Data}
                    setTable1Data={setTable1Data}
                    selectedDomain={selectedDomain}
                    topics={topics}
                    courses={courses}
                  />

                  <TrainingScheduleTable
                    table2Data={table2Data}
                    setTable2Data={setTable2Data}
                    table1Data={table1Data}
                  />

                </>
              )}

              {selectedPhases.includes('phase-1') && selectedPhases.includes('phase-2') && (
                <Phase2Dates
                  phase2Dates={phase2Dates}
                  setPhase2Dates={setPhase2Dates}
                />

              )}
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              disabled={loading || selectedPhases.length === 0}
            >
              {loading ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InitiationModal;
