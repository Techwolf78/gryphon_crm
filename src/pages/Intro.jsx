import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import introData from '../data/introData.json';
import CompanyTour from '../components/Intro/CompanyTour';
import DepartmentSelection from '../components/Intro/DepartmentSelection';
import DepartmentOverview from '../components/Intro/DepartmentOverview';
import Quiz from '../components/Intro/Quiz';
import CompletionReport from '../components/Intro/CompletionReport';

const Intro = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState('tour');
  const [selectedDept, setSelectedDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [tourData, setTourData] = useState(null);
  const [deptData, setDeptData] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [completedDepartment, setCompletedDepartment] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      let tourDataFetched = null;
      let departmentsFetched = [];

      try {
        // First check if user has already completed onboarding
        const onboardingDoc = await getDoc(doc(db, 'users', user.uid, 'onboarding', 'data'));
        if (onboardingDoc.exists() && onboardingDoc.data().completed) {
          setOnboardingCompleted(true);
          setCompletedDepartment(onboardingDoc.data().department);
          setLoading(false);
          return;
        }

        // Fetch tour data
        const tourDoc = await getDoc(doc(db, 'intro', 'tour'));
        if (tourDoc.exists()) {
          tourDataFetched = tourDoc.data();
        }

        // Fetch departments
        const deptsSnapshot = await getDocs(collection(db, 'intro', 'departments'));
        departmentsFetched = deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error fetching intro data:', error);
        // Continue with mock data
      }

      // Set tour data (mock if not fetched)
      if (tourDataFetched) {
        setTourData(tourDataFetched);
      } else {
        setTourData(introData.tour);
      }

      // Set departments (mock if not fetched)
      if (departmentsFetched.length > 0) {
        setDepartments(departmentsFetched);
      } else {
        setDepartments(introData.departments);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSelectDept = async (dept) => {
    setSelectedDept(dept);
    setDeptData(dept.content);
    
    let quizDataFetched = null;
    
    try {
      const quizDoc = await getDoc(doc(db, 'intro/quizzes', dept.id));
      if (quizDoc.exists()) {
        quizDataFetched = quizDoc.data();
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      // Continue with mock data
    }

    // Set quiz data (mock if not fetched)
    if (quizDataFetched) {
      setQuizData(quizDataFetched);
    } else {
      setQuizData({
        questions: introData.quizzes[dept.id] || [
          {
            question: 'What is your department?',
            options: [dept.name, 'Other', 'Unknown', 'None'],
            correct: 0
          }
        ]
      });
    }
    
    setStep('overview');
  };

  const startQuiz = () => {
    setStartTime(new Date());
    setStep('quiz');
  };

  const finishQuiz = (score) => {
    setQuizScore(score);
    setEndTime(new Date());
    if (score >= 70) {
      setStep('report');
    } else {
      toast.error('Quiz failed. Please review the department overview and try again.');
      setStep('overview');
    }
  };

  const completeOnboarding = async () => {
    const timeTaken = endTime - startTime;
    const report = {
      name: user.displayName || user.email,
      department: selectedDept.name,
      score: quizScore,
      timeTaken,
      date: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'onboarding', 'data'), {
        department: selectedDept.id,
        score: quizScore,
        report,
        completed: true,
      });
      toast.success('Onboarding completed successfully!');
      setOnboardingCompleted(true);
      setCompletedDepartment(selectedDept.id);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error('Failed to save completion data');
    }
  };

  const goToDepartment = () => {
    // Map department IDs to route paths
    const departmentRoutes = {
      admin: '/dashboard/admin',
      sales: '/dashboard/sales',
      'learning-development': '/dashboard/learning-development',
      placement: '/dashboard/placement',
      marketing: '/dashboard/marketing',
      ca: '/dashboard/ca',
      hr: '/dashboard/hr',
      purchase: '/dashboard/purchase'
    };

    const route = departmentRoutes[completedDepartment] || '/dashboard';
    navigate(route);
  };

  if (loading) {
    return <div>Loading onboarding...</div>;
  }

  // If onboarding is already completed, show completion message
  if (onboardingCompleted) {
    return (
      <div className="mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-green-800 mb-2">Thank you for taking the tour!</h1>
          <p className="text-green-700 mb-4">
            You have successfully completed the Gryphon CRM onboarding process.
            You can now access your department dashboard.
          </p>
          <button
            onClick={goToDepartment}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            Go to My Department
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {step === 'tour' && <CompanyTour data={tourData} onNext={() => setStep('selectDept')} />}
      {step === 'selectDept' && <DepartmentSelection departments={departments} onSelect={handleSelectDept} />}
      {step === 'overview' && <DepartmentOverview data={deptData} onStartQuiz={startQuiz} />}
      {step === 'quiz' && <Quiz data={quizData} onFinish={finishQuiz} />}
      {step === 'report' && <CompletionReport report={{ name: user.displayName || user.email, department: selectedDept.name, score: quizScore, timeTaken: endTime - startTime, date: new Date() }} onComplete={completeOnboarding} />}
    </div>
  );
};

export default Intro;