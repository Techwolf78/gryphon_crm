import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { doc, collection, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FiX, FiChevronRight, FiCheck, FiClock, FiAlertCircle } from 'react-icons/fi';
import BatchDetailsTable from './Initiate/BatchDetailsTable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PHASE_OPTIONS = ['phase-1', 'phase-2'];
const DOMAIN_OPTIONS = ['Technical', 'Soft skills', 'Aptitude', 'Tools'];

function InitiationModal({ training, onClose, onConfirm }) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);

  const [commonFields, setCommonFields] = useState({
    trainingStartDate: null,
    trainingEndDate: null,
    collegeStartTime: '',
    collegeEndTime: '',
    lunchStartTime: '',
    lunchEndTime: ''
  });

  const [phase2Dates, setPhase2Dates] = useState({
    startDate: null,
    endDate: null
  });

  const [table1Data, setTable1Data] = useState([]);

  // Helper function to calculate total assigned students
  const getTotalAssignedStudents = (row) => {
    if (!row?.batches) return 0;
    return row.batches.reduce((total, batch) => {
      return total + (Number(batch.batchPerStdCount) || 0);
    }, 0);
  };

  // Get domain hours
  const getDomainHours = (domain) => {
    if (!domain) return 0;
    const topicMap = {
      Technical: "Domain Technical",
      NonTechnical: "Soft Skills",
      'Soft skills': "Soft Skills",
      Aptitude: "Aptitude",
      Tools: "Tools"
    };
    const topicName = topicMap[domain] || domain;
    const topicObj = topics?.find(t =>
      t?.topic?.trim().toLowerCase() === topicName?.toLowerCase()
    );
    return topicObj?.hours || 0;
  };

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

  useEffect(() => {
    if (selectedDomain && courses.length > 0) {
      const domainHours = getDomainHours(selectedDomain);
      const rows = courses.map(course => ({
        batch: course.specialization,
        stdCount: course.students,
        hrs: domainHours,
        assignedHours: domainHours,
        batches: [{
          batchPerStdCount: '',
          batchCode: `${course.specialization}1`
        }]
      }));
      setTable1Data(rows);
    }
  }, [selectedDomain, courses, topics]);

  const handlePhaseChange = (phase) => {
    setSelectedPhases(prev =>
      prev.includes(phase)
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
    if (phase === 'phase-1' && !selectedPhases.includes(phase)) {
      setSelectedDomain('');
    }
    setError(null);
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const validateForm = () => {
    if (selectedPhases.length === 0) {
      setError('Please select at least one phase');
      return false;
    }
    if (selectedPhases.includes('phase-1') && !selectedDomain) {
      setError('Please select a domain for phase 1');
      return false;
    }
    if (!commonFields.trainingStartDate || !commonFields.trainingEndDate) {
      setError('Please select training start and end dates');
      return false;
    }
    if (!commonFields.collegeStartTime || !commonFields.collegeEndTime) {
      setError('Please enter college start and end times');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
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
        };
        if (phase === 'phase-1') {
          phaseData.domain = selectedDomain;
          phaseData.domainHours = getDomainHours(selectedDomain);
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

      setSuccess('Training phases initiated successfully!');
      setLoading(false);

      setTimeout(() => {
        if (onConfirm) onConfirm({
          phases: selectedPhases,
          details,
          ...commonFields,
          domain: selectedDomain,
          table1Data,
          ...phase2Dates
        });
        if (onClose) onClose();
      }, 1500);

    } catch (err) {
      console.error('Error saving phase data:', err);
      setError('Failed to save phase data. Please try again.');
      setLoading(false);
    }
  };

  const getStepTitle = (step) => {
    switch(step) {
      case 1: return 'Training Details';
      case 2: return 'Batch & Trainer Assignment';
      default: return 'Setup';
    }
  };

  const canProceedToNextStep = () => {
    return true;
  };

  return (
    <div className="fixed inset-0 z-54 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/50">
      <div className="relative w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Initiate Training</h2>
              <p className="text-gray-500 mt-1">
                {training?.collegeName} • {training?.collegeCode}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1 -mr-1"
              disabled={loading}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-8">
            <div className="flex items-center justify-between relative">
              {[1, 2].map((step) => (
                <div key={step} className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => currentStep > step && setCurrentStep(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors
                      ${currentStep > step ? 'bg-green-100 text-green-600' : 
                       currentStep === step ? 'bg-blue-600 text-white' : 
                       'bg-gray-100 text-gray-400'}
                    `}
                    disabled={currentStep <= step}
                  >
                    {currentStep > step ? <FiCheck /> : step}
                  </button>
                  <span className={`text-xs mt-2 font-medium ${currentStep >= step ? 'text-gray-700' : 'text-gray-400'}`}>
                    {getStepTitle(step)}
                  </span>
                </div>
              ))}
              <div className="absolute top-5 left-10 right-10 h-1 bg-gray-200">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 ease-in-out" 
                  style={{ width: `${(currentStep - 1) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Phase Selection + Common Details */}
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Phase Selection */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Select Training Phases</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PHASE_OPTIONS.map((phase) => (
                      <div 
                        key={phase}
                        onClick={() => handlePhaseChange(phase)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all
                          ${selectedPhases.includes(phase) ? 
                            'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 
                            'border-gray-200 hover:border-gray-300'}
                        `}
                      >
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3
                            ${selectedPhases.includes(phase) ? 
                              'bg-blue-500 border-blue-500' : 
                              'bg-white border-gray-300'}
                          `}>
                            {selectedPhases.includes(phase) && (
                              <FiCheck className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-medium text-gray-800 capitalize">
                            {phase.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Common Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Training Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <DatePicker
                        selected={commonFields.trainingStartDate ? new Date(commonFields.trainingStartDate) : null}
                        onChange={date => setCommonFields({...commonFields, trainingStartDate: date ? date.toISOString().slice(0,10) : ''})}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <DatePicker
                        selected={commonFields.trainingEndDate ? new Date(commonFields.trainingEndDate) : null}
                        onChange={date => setCommonFields({...commonFields, trainingEndDate: date ? date.toISOString().slice(0,10) : ''})}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">College Start Time</label>
                      <DatePicker
                        selected={commonFields.collegeStartTime ? new Date(`1970-01-01T${commonFields.collegeStartTime}`) : null}
                        onChange={date => setCommonFields({...commonFields, collegeStartTime: date ? date.toTimeString().slice(0,5) : ''})}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">College End Time</label>
                      <DatePicker
                        selected={commonFields.collegeEndTime ? new Date(`1970-01-01T${commonFields.collegeEndTime}`) : null}
                        onChange={date => setCommonFields({...commonFields, collegeEndTime: date ? date.toTimeString().slice(0,5) : ''})}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lunch Start Time</label>
                      <DatePicker
                        selected={commonFields.lunchStartTime ? new Date(`1970-01-01T${commonFields.lunchStartTime}`) : null}
                        onChange={date => setCommonFields({...commonFields, lunchStartTime: date ? date.toTimeString().slice(0,5) : ''})}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lunch End Time</label>
                      <DatePicker
                        selected={commonFields.lunchEndTime ? new Date(`1970-01-01T${commonFields.lunchEndTime}`) : null}
                        onChange={date => setCommonFields({...commonFields, lunchEndTime: date ? date.toTimeString().slice(0,5) : ''})}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {selectedPhases.includes('phase-1') && selectedPhases.includes('phase-2') && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <h4 className="text-md font-medium text-gray-900">Phase 2 Dates</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phase 2 Start Date</label>
                          <input
                            type="date"
                            value={phase2Dates.startDate || ''}
                            onChange={(e) => setPhase2Dates({...phase2Dates, startDate: e.target.value})}
                            className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phase 2 End Date</label>
                          <input
                            type="date"
                            value={phase2Dates.endDate || ''}
                            onChange={(e) => setPhase2Dates({...phase2Dates, endDate: e.target.value})}
                            className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Training Domain + Batch Details */}
            {currentStep === 2 && (
              <>
                {selectedPhases.includes('phase-1') && (
                  <div className="mb-8">
                    <label className="block text-lg font-medium text-gray-900 mb-2">Training Domain</label>
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="w-full max-w-xs rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a domain</option>
                      {DOMAIN_OPTIONS.map((domain) => (
                        <option key={domain} value={domain}>{domain}</option>
                      ))}
                    </select>
                  </div>
                )}
                <BatchDetailsTable 
                  table1Data={table1Data}
                  setTable1Data={setTable1Data}
                  selectedDomain={selectedDomain}
                  topics={topics}
                  courses={courses}
                  getDomainHours={getDomainHours}
                  commonFields={commonFields} // <-- pass this prop
                />
              </>
            )}

            {/* Status Messages */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiCheck className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">{success}</h3>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : onClose()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {currentStep > 1 ? 'Back' : 'Cancel'}
            </button>
            <div className="flex items-center space-x-3">
              {currentStep < 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceedToNextStep() || loading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${!canProceedToNextStep() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                  `}
                >
                  Next
                  <FiChevronRight className="ml-2 -mr-1 w-5 h-5" />
                </button>
              )}
              {currentStep === 2 && (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !canProceedToNextStep()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <FiClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InitiationModal;