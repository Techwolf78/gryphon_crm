import React, { useState } from 'react';

const Quiz = ({ data, onFinish }) => {
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (!data || !data.questions) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading quiz...</p>
      </div>
    </div>
  );

  const questions = data.questions;
  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const isFirstQuestion = currentQuestion === 0;

  const handleAnswer = (optionIndex) => {
    setAnswers({ ...answers, [currentQuestion]: optionIndex });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) score++;
    });
    const percentage = (score / questions.length) * 100;
    setSubmitted(true);
    onFinish(percentage);
  };

  const goToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  if (submitted) {
    const score = ((Object.keys(answers).filter(i => answers[i] === questions[i]?.correct).length / questions.length) * 100);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="mx-auto text-center">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Quiz Submitted!</h1>
            <p className="text-base text-gray-600">Your score: {score.toFixed(0)}%</p>
            <div className="mt-4 text-sm text-gray-500">
              {score >= 70 ? 'Congratulations! You passed.' : 'Please review the material and try again.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto">
        {/* Header and Progress - Side by Side */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          {/* Left side - Header */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Department Assessment
            </h1>
            <p className="text-base text-gray-600">
              Test your knowledge of your department's key concepts and responsibilities
            </p>
          </div>

          {/* Right side - Progress indicator */}
          <div className="lg:w-80 bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-700">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Current question */}
        {currentQ && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 mb-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="shrink-0 w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-4 leading-tight">
                  {currentQ.question}
                </h2>
                <div className="space-y-3">
                  {currentQ.options.map((opt, j) => (
                    <label
                      key={j}
                      className={`group flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                        answers[currentQuestion] === j
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${currentQuestion}`}
                        value={j}
                        onChange={() => handleAnswer(j)}
                        checked={answers[currentQuestion] === j}
                        className="mr-4 w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className={`text-base transition-colors ${
                        answers[currentQuestion] === j ? 'text-blue-900 font-medium' : 'text-gray-700'
                      }`}>
                        {opt}
                      </span>
                      {answers[currentQuestion] === j && (
                        <div className="ml-auto">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={`group flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              isFirstQuestion
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
            }`}
            aria-label="Previous question"
          >
            <svg className={`w-5 h-5 transition-transform ${isFirstQuestion ? '' : 'group-hover:-translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          {/* Question indicators */}
          <div className="flex space-x-3" role="tablist" aria-label="Quiz questions">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`group relative w-8 h-8 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  index === currentQuestion
                    ? 'bg-blue-600 text-white shadow-lg scale-110'
                    : answers[index] !== undefined
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label={`Question ${index + 1}${answers[index] !== undefined ? ' (Answered)' : ' (Unanswered)'}`}
                role="tab"
                aria-selected={index === currentQuestion}
              >
                <div className="flex items-center justify-center w-full h-full font-semibold text-sm">
                  {index + 1}
                </div>
                {index === currentQuestion && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== questions.length}
              className={`group flex items-center space-x-2 px-6 py-2 rounded-xl font-semibold transition-all duration-200 ${
                Object.keys(answers).length === questions.length
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              aria-label="Submit quiz"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Submit Quiz</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={answers[currentQuestion] === undefined}
              className={`group flex items-center space-x-2 px-6 py-2 rounded-xl font-semibold transition-all duration-200 ${
                answers[currentQuestion] !== undefined
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              aria-label="Next question"
            >
              <span>Next</span>
              <svg className={`w-5 h-5 transition-transform ${answers[currentQuestion] !== undefined ? 'group-hover:translate-x-1' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress summary */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Answered: {Object.keys(answers).length} of {questions.length} questions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Quiz;