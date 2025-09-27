import { useState, useEffect } from "react";
import questionsData from "./data/questions.json";

export default function App() {
  const [step, setStep] = useState("start"); // start, quiz, result
  const [teamName, setTeamName] = useState("");
  const [flagColor, setFlagColor] = useState("blue");
  const [questions, setQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]); // Track unused questions
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]); // Store user answers
  
  // New tracking states
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [endTimestamp, setEndTimestamp] = useState(null);
  const [allQuestionsInvolved, setAllQuestionsInvolved] = useState([]);
  const [questionChangeLog, setQuestionChangeLog] = useState([]);

  // Fisher-Yates shuffle algorithm for better randomization
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Pick 5 random questions when quiz starts
  useEffect(() => {
    if (step === "quiz") {
      const shuffled = shuffleArray(questionsData);
      const initialQuestions = shuffled.slice(0, 5);
      
      setQuestions(initialQuestions);
      setAvailableQuestions(shuffled.slice(5)); // Store remaining questions for changes
      setCurrentQIndex(0);
      setScore(0);
      setSelectedOption("");
      setFeedback("");
      setFinished(false);
      setUserAnswers([]);
      
      // Initialize tracking
      setStartTimestamp(new Date().toISOString());
      setEndTimestamp(null);
      setAllQuestionsInvolved(initialQuestions.map(q => ({ ...q })));
      setQuestionChangeLog([]);
    }
  }, [step]);

  const handleSubmit = () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === questions[currentQIndex].answer;
    
    // Store user answer
    setUserAnswers(prev => [...prev, {
      question: questions[currentQIndex].question,
      userAnswer: selectedOption,
      correctAnswer: questions[currentQIndex].answer,
      isCorrect: isCorrect
    }]);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback("Correct ✅");
      if (score + 1 >= 3) {
        setFinished(true);
        setEndTimestamp(new Date().toISOString());
        setStep("result");
        return;
      }
    } else {
      setFeedback(`Wrong ❌ (Correct: ${questions[currentQIndex].answer})`);
    }
  };

  const handleNext = () => {
    setSelectedOption("");
    setFeedback("");
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Quiz finished - always go to result screen
      setFinished(true);
      setEndTimestamp(new Date().toISOString());
      setStep("result");
    }
  };

  const handleSkipQuestion = () => {
    // Store skipped answer
    setUserAnswers(prev => [...prev, {
      question: questions[currentQIndex].question,
      userAnswer: "skipped",
      correctAnswer: questions[currentQIndex].answer,
      isCorrect: false
    }]);

    // Move to next question or finish quiz
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption("");
      setFeedback("");
    } else {
      // Quiz finished - go to result screen
      setFinished(true);
      setEndTimestamp(new Date().toISOString());
      setStep("result");
    }
  };

  const handleChangeQuestion = () => {
    if (availableQuestions.length === 0) {
      alert("No more questions available to swap!");
      return;
    }

    // Get a new random question from available questions
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const newQuestion = availableQuestions[randomIndex];
    
    // Replace current question with new one
    const updatedQuestions = [...questions];
    const oldQuestion = updatedQuestions[currentQIndex];
    updatedQuestions[currentQIndex] = newQuestion;
    
    // Update available questions (remove new question, add old question)
    const updatedAvailable = [...availableQuestions];
    updatedAvailable.splice(randomIndex, 1); // Remove the question we just used
    updatedAvailable.push(oldQuestion); // Add the old question back to available pool
    
    // Track the change
    const changeLogEntry = {
      timestamp: new Date().toISOString(),
      questionPosition: currentQIndex + 1,
      oldQuestion: oldQuestion.question,
      newQuestion: newQuestion.question,
      reasonForChange: "User requested question change"
    };
    
    // Add new question to all questions involved if not already present
    setAllQuestionsInvolved(prev => {
      const exists = prev.some(q => q.question === newQuestion.question);
      if (!exists) {
        return [...prev, { ...newQuestion }];
      }
      return prev;
    });
    
    setQuestions(updatedQuestions);
    setAvailableQuestions(updatedAvailable);
    setSelectedOption(""); // Clear any selected option
    setFeedback(""); // Clear any feedback
    setQuestionChangeLog(prev => [...prev, changeLogEntry]);
  };

  const handleRestart = () => {
    // Reset everything and go back to start
    setTeamName("");
    setFlagColor("blue");
    setQuestions([]);
    setAvailableQuestions([]);
    setCurrentQIndex(0);
    setScore(0);
    setSelectedOption("");
    setFeedback("");
    setFinished(false);
    setUserAnswers([]);
    setStartTimestamp(null);
    setEndTimestamp(null);
    setAllQuestionsInvolved([]);
    setQuestionChangeLog([]);
    setStep("start");
  };

  const handleDownloadResult = () => {
    const duration = startTimestamp && endTimestamp 
      ? Math.round((new Date(endTimestamp) - new Date(startTimestamp)) / 1000) 
      : null;

    const resultData = {
      teamName,
      flagColor,
      score,
      totalQuestions: questions.length,
      passed: score >= 3,
      
      // Timing information
      startTimestamp,
      endTimestamp,
      durationInSeconds: duration,
      
      // All questions that were involved in the quiz (including changed ones)
      allQuestionsInvolved: allQuestionsInvolved.map((q, i) => ({
        questionId: i + 1,
        question: q.question,
        options: q.options,
        correctAnswer: q.answer,
        wasUsedInFinalQuiz: questions.some(finalQ => finalQ.question === q.question)
      })),
      
      // Question change log
      questionChangeLog,
      totalQuestionChanges: questionChangeLog.length,
      
      // Final quiz results
      finalQuizResults: questions.map((q, i) => ({
        questionNumber: i + 1,
        question: q.question,
        options: q.options,
        correctAnswer: q.answer,
        userAnswer: userAnswers[i]?.userAnswer || "Not answered",
        isCorrect: userAnswers[i]?.isCorrect || false
      })),
      
      // Summary statistics
      summary: {
        totalQuestionsEncountered: allQuestionsInvolved.length,
        questionsChangedCount: questionChangeLog.length,
        correctAnswers: score,
        incorrectAnswers: userAnswers.filter(a => !a.isCorrect && a.userAnswer !== 'skipped').length,
        skippedQuestions: userAnswers.filter(a => a.userAnswer === 'skipped').length,
        unansweredQuestions: questions.length - userAnswers.length,
        flagCaptured: score >= 3
      }
    };

    const blob = new Blob([JSON.stringify(resultData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CTF3_Quiz_Results_${teamName}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      {/* Start Screen */}
      {step === "start" && (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-700">
          <h1 className="text-3xl font-bold text-blue-400 mb-4">
            Capture The Flag 3.0
          </h1>
          <p className="mb-6 text-gray-400">by IEEE ComSoc</p>

          <input
            type="text"
            placeholder="Enter Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-400 focus:outline-none mb-4 text-white"
          />

          <label className="block mb-2 text-gray-400">
            Enter Flag Color (name, e.g., red, blue, orange)
          </label>
          <input
            type="text"
            list="color-options"
            value={flagColor}
            onChange={(e) => setFlagColor(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-400 focus:outline-none mb-6 text-white"
          />
          <datalist id="color-options">
            <option value="red" />
            <option value="blue" />
            <option value="green" />
            <option value="orange" />
            <option value="yellow" />
            <option value="purple" />
            <option value="pink" />
            <option value="cyan" />
            <option value="lime" />
            <option value="teal" />
          </datalist>

          <button
            onClick={() => setStep("quiz")}
            disabled={!teamName || !flagColor}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
        </div>
      )}

      {/* Quiz Screen */}
      {step === "quiz" && questions.length > 0 && (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-700">
          <div className="flex justify-between mb-4">
            <span className="text-gray-400">Team: {teamName}</span>
            <span className="font-bold text-blue-400">
              Score: {score} / 3 | Question: {currentQIndex + 1} / {questions.length}
            </span>
          </div>

          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold flex-1 pr-4">
              <span className="text-blue-400 font-bold">Question {currentQIndex + 1}:</span> {questions[currentQIndex].question}
            </h2>
            
            {/* Change Question Button - Only show if no feedback yet and questions available */}
            {!feedback && availableQuestions.length > 0 && (
              <button
                onClick={handleChangeQuestion}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm whitespace-nowrap"
                title="Change to a different question"
              >
                🔄 Change Question
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 mb-6">
            {questions[currentQIndex].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedOption(opt)}
                disabled={!!feedback} // Disable after answering
                className={`p-4 rounded-lg text-left transition-all duration-200 border-2 
                  ${selectedOption === opt 
                    ? "bg-blue-600 border-blue-400 text-white shadow-lg transform scale-[1.02]" 
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-100"
                  }
                  ${feedback ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span className="font-semibold text-blue-300 mr-2">
                  {String.fromCharCode(65 + i)}.
                </span> 
                {opt}
              </button>
            ))}
          </div>

          {feedback && (
            <div className="mb-4 p-3 rounded-lg bg-gray-700 border border-gray-600">
              <p className="text-gray-300">{feedback}</p>
            </div>
          )}

          {!feedback ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition flex-1"
                >
                  Submit Answer
                </button>
                
                <button
                  onClick={handleSkipQuestion}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition flex-1"
                  title="Skip this question and move to next"
                >
                  ⏭️ Skip Question
                </button>
              </div>
              
              {availableQuestions.length > 0 && (
                <div className="text-center text-sm">
                  <p className="text-gray-400">
                    {availableQuestions.length} questions available to swap
                  </p>
                  {questionChangeLog.length > 0 && (
                    <p className="text-yellow-400">
                      {questionChangeLog.length} change{questionChangeLog.length !== 1 ? 's' : ''} made
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-4">
              {currentQIndex + 1 < questions.length && !finished ? (
                <button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Finish Quiz
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result Screen */}
      {step === "result" && (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-blue-400 text-center">Quiz Results</h2>
          
          <div className="text-center mb-6">
            <p className="mb-2 text-lg">Team: <span className="font-semibold text-blue-400">{teamName}</span></p>
            <p className="mb-4 text-xl">Final Score: <span className="font-bold text-blue-400">{score} / {questions.length}</span></p>
            
            {/* Show timing and change information */}
            {startTimestamp && endTimestamp && (
              <div className="mb-4 text-sm text-gray-400">
                <p>Duration: {Math.round((new Date(endTimestamp) - new Date(startTimestamp)) / 1000)} seconds</p>
                {questionChangeLog.length > 0 && (
                  <p>Questions changed: {questionChangeLog.length} time{questionChangeLog.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}

            {score >= 3 ? (
              <div className="mb-6">
                <p className="text-lg font-semibold mb-4 text-green-400">
                  🏴 Flag Captured! Congratulations!
                </p>
                <div
                  className="w-32 h-20 mx-auto rounded border-2 border-green-400"
                  style={{ backgroundColor: flagColor }}
                />
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-lg font-semibold mb-4 text-red-400">
                  🚩 Flag Defended! You need 3+ correct answers to capture the flag.
                </p>
                <div className="w-32 h-20 mx-auto rounded border-2 border-red-400 bg-gray-700 flex items-center justify-center">
                  <span className="text-red-400 text-2xl">🔒</span>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Results */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-400">Question Review:</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {userAnswers.map((answer, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-700 border border-gray-600">
                  <p className="font-semibold mb-1">
                    <span className="text-blue-400">Q{i + 1}:</span> {answer.question}
                  </p>
                  <p className={`text-sm ${answer.isCorrect ? 'text-green-400' : answer.userAnswer === 'skipped' ? 'text-yellow-400' : 'text-red-400'}`}>
                    Your answer: {answer.userAnswer === 'skipped' ? 'Skipped ⏭️' : answer.userAnswer} {answer.isCorrect ? '✅' : answer.userAnswer === 'skipped' ? '⏭️' : '❌'}
                  </p>
                  {(!answer.isCorrect || answer.userAnswer === 'skipped') && (
                    <p className="text-sm text-gray-400">
                      Correct answer: {answer.correctAnswer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleRestart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              🔄 Restart Quiz
            </button>

            <button
              onClick={handleDownloadResult}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              📥 Download Detailed Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}