import { useState, useEffect } from "react";
import questionSets from "./data/questions.json";
import downloadPDF from "./utils/downloadPDF";


export default function App() {
  const [step, setStep] = useState("start"); // start, quiz, result
  const [teamName, setTeamName] = useState("");
  const [flagColor, setFlagColor] = useState("");
  const [currentSet, setCurrentSet] = useState(null);
  const [availableSets, setAvailableSets] = useState([]); // Track unused sets
  const [usedSets, setUsedSets] = useState([]); // Track used sets for duplicate prevention
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]); // Store user answers
  
  // New tracking states
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [endTimestamp, setEndTimestamp] = useState(null);
  const [allSetsInvolved, setAllSetsInvolved] = useState([]);
  const [setChangeLog, setSetChangeLog] = useState([]);

  // Fisher-Yates shuffle algorithm for better randomization
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Pick 1 random question set when quiz starts
  useEffect(() => {
    if (step === "quiz") {
      const shuffledSets = shuffleArray(questionSets);
      const selectedSet = shuffledSets[0];
      
      setCurrentSet(selectedSet);
      setAvailableSets(shuffledSets.slice(1)); // Store remaining sets for changes
      setUsedSets([selectedSet.setId]); // Track this set as used
      setCurrentQIndex(0);
      setScore(0);
      setSelectedOption("");
      setFeedback("");
      setFinished(false);
      setUserAnswers([]);
      
      // Initialize tracking
      setStartTimestamp(new Date().toISOString());
      setEndTimestamp(null);
      setAllSetsInvolved([{ ...selectedSet }]);
      setSetChangeLog([]);
    }
  }, [step]);

  const handleSubmit = () => {
    if (!selectedOption) return;

    const currentQuestion = currentSet.questions[currentQIndex];
    const isCorrect = selectedOption === currentQuestion.answer;
    
    // Store user answer
    setUserAnswers(prev => [...prev, {
      question: currentQuestion.question,
      domain: currentQuestion.domain,
      userAnswer: selectedOption,
      correctAnswer: currentQuestion.answer,
      isCorrect: isCorrect,
      setInfo: {
        setId: currentSet.setId,
        setName: currentSet.setName,
        questionId: currentQuestion.id
      }
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
      setFeedback(`Wrong ❌ (Correct: ${currentQuestion.answer})`);
    }
  };

  const handleNext = () => {
    setSelectedOption("");
    setFeedback("");
    if (currentQIndex + 1 < currentSet.questions.length) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Quiz finished - always go to result screen
      setFinished(true);
      setEndTimestamp(new Date().toISOString());
      setStep("result");
    }
  };

  const handleSkipQuestion = () => {
    const currentQuestion = currentSet.questions[currentQIndex];
    
    // Store skipped answer
    setUserAnswers(prev => [...prev, {
      question: currentQuestion.question,
      domain: currentQuestion.domain,
      userAnswer: "skipped",
      correctAnswer: currentQuestion.answer,
      isCorrect: false,
      setInfo: {
        setId: currentSet.setId,
        setName: currentSet.setName,
        questionId: currentQuestion.id
      }
    }]);

    // Move to next question or finish quiz
    if (currentQIndex + 1 < currentSet.questions.length) {
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

  const handleChangeQuestionSet = () => {
    // Filter available sets to exclude already used ones
    const unusedSets = availableSets.filter(set => !usedSets.includes(set.setId));
    
    if (unusedSets.length === 0) {
      alert("No more question sets available to swap! All sets have been used.");
      return;
    }

    // Get a new random set from unused sets
    const randomIndex = Math.floor(Math.random() * unusedSets.length);
    const newSet = unusedSets[randomIndex];
    
    // Track the change
    const changeLogEntry = {
      timestamp: new Date().toISOString(),
      oldSet: {
        setId: currentSet.setId,
        setName: currentSet.setName
      },
      newSet: {
        setId: newSet.setId,
        setName: newSet.setName
      },
      reasonForChange: "User requested question set change",
      currentProgress: `${currentQIndex + 1}/${currentSet.questions.length} questions completed`
    };
    
    // Add new set to all sets involved if not already present
    setAllSetsInvolved(prev => {
      const exists = prev.some(set => set.setId === newSet.setId);
      if (!exists) {
        return [...prev, { ...newSet }];
      }
      return prev;
    });
    
    // Update used sets to include the new set
    setUsedSets(prev => [...prev, newSet.setId]);
    
    // Reset quiz state with new set
    setCurrentSet(newSet);
    setCurrentQIndex(0); // Start from beginning of new set
    setSelectedOption(""); // Clear any selected option
    setFeedback(""); // Clear any feedback
    setUserAnswers([]); // Reset answers since we're starting a new set
    setScore(0); // Reset score
    setSetChangeLog(prev => [...prev, changeLogEntry]);
  };

  const handleRestart = () => {
    // Reset everything and go back to start
    setTeamName("");
    setFlagColor("blue");
    setCurrentSet(null);
    setAvailableSets([]);
    setUsedSets([]);
    setCurrentQIndex(0);
    setScore(0);
    setSelectedOption("");
    setFeedback("");
    setFinished(false);
    setUserAnswers([]);
    setStartTimestamp(null);
    setEndTimestamp(null);
    setAllSetsInvolved([]);
    setSetChangeLog([]);
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
      totalQuestions: currentSet ? currentSet.questions.length : 0,
      passed: score >= 3,
      
      // Timing information
      startTimestamp,
      endTimestamp,
      durationInSeconds: duration,
      
      // Current question set info
      finalQuestionSet: currentSet ? {
        setId: currentSet.setId,
        setName: currentSet.setName,
        questions: currentSet.questions
      } : null,
      
      // All question sets that were involved
      allQuestionSetsInvolved: allSetsInvolved.map(set => ({
        setId: set.setId,
        setName: set.setName,
        totalQuestions: set.questions.length,
        wasUsedInFinalQuiz: set.setId === (currentSet?.setId || null)
      })),
      
      // Set change log
      setChangeLog,
      totalSetChanges: setChangeLog.length,
      usedSetIds: usedSets,
      
      // Final quiz results
      finalQuizResults: userAnswers.map((answer, i) => ({
        questionNumber: i + 1,
        domain: answer.domain,
        question: answer.question,
        userAnswer: answer.userAnswer,
        correctAnswer: answer.correctAnswer,
        isCorrect: answer.isCorrect,
        setInfo: answer.setInfo
      })),
      
      // Summary statistics
      summary: {
        totalQuestionSetsEncountered: allSetsInvolved.length,
        setsChangedCount: setChangeLog.length,
        correctAnswers: score,
        incorrectAnswers: userAnswers.filter(a => !a.isCorrect && a.userAnswer !== 'skipped').length,
        skippedQuestions: userAnswers.filter(a => a.userAnswer === 'skipped').length,
        unansweredQuestions: (currentSet?.questions.length || 0) - userAnswers.length,
        flagCaptured: score >= 3,
        domainBreakdown: userAnswers.reduce((acc, answer) => {
          if (!acc[answer.domain]) {
            acc[answer.domain] = { correct: 0, total: 0 };
          }
          acc[answer.domain].total++;
          if (answer.isCorrect) {
            acc[answer.domain].correct++;
          }
          return acc;
        }, {})
      }
    };

  //   const blob = new Blob([JSON.stringify(resultData, null, 2)], {
  //     type: "application/json",
  //   });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `CTF3_Quiz_Results_${teamName}_${new Date().toISOString().slice(0,10)}.json`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };
  
  // Call PDF download instead of JSON
  downloadPDF(resultData);
  };

  // Get unused sets count for display
  const getUnusedSetsCount = () => {
    return availableSets.filter(set => !usedSets.includes(set.setId)).length;
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

          <div className="mt-4 text-sm text-gray-400">
            <p>📚 {questionSets.length} question sets available</p>
            <p>🎯 Each set contains 5 questions from different domains</p>
            <p>🏆 Score 3+ correct to capture the flag!</p>
          </div>
        </div>
      )}

      {/* Quiz Screen */}
      {step === "quiz" && currentSet && (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-700">
          <div className="flex justify-between mb-4">
            <span className="text-gray-400">Team: {teamName}</span>
            <span className="font-bold text-blue-400">
              Score: {score} / 3 | Question: {currentQIndex + 1} / {currentSet.questions.length}
            </span>
          </div>

          {/* Set Information */}
          <div className="bg-gray-700 p-3 rounded-lg mb-4 border border-gray-600">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-blue-400 font-semibold">{currentSet.setName}</span>
                <span className="text-gray-400 ml-2">({currentSet.questions[currentQIndex].domain})</span>
              </div>
              {/* Change Question Set Button - Only show if no feedback yet and sets available */}
              {!feedback && getUnusedSetsCount() > 0 && (
                <button
                  onClick={handleChangeQuestionSet}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm whitespace-nowrap"
                  title="Change to a different question set"
                >
                  🔄 Change Set
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              <span className="text-blue-400 font-bold">Question {currentQIndex + 1}:</span> {currentSet.questions[currentQIndex].question}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-6">
            {currentSet.questions[currentQIndex].options.map((opt, i) => (
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
              
              <div className="text-center text-sm">
                <p className="text-gray-400">
                  {getUnusedSetsCount()} unused question sets available to swap
                </p>
                {setChangeLog.length > 0 && (
                  <p className="text-yellow-400">
                    {setChangeLog.length} set change{setChangeLog.length !== 1 ? 's' : ''} made
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              {currentQIndex + 1 < currentSet.questions.length && !finished ? (
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
            <p className="mb-2 text-sm text-gray-400">Question Set: <span className="font-semibold text-yellow-400">{currentSet?.setName}</span></p>
            <p className="mb-4 text-xl">Final Score: <span className="font-bold text-blue-400">{score} / {currentSet?.questions.length || 5}</span></p>
            
            {/* Show timing and change information */}
            {startTimestamp && endTimestamp && (
              <div className="mb-4 text-sm text-gray-400">
                <p>Duration: {Math.round((new Date(endTimestamp) - new Date(startTimestamp)) / 1000)} seconds</p>
                {setChangeLog.length > 0 && (
                  <p>Question sets changed: {setChangeLog.length} time{setChangeLog.length !== 1 ? 's' : ''}</p>
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
                    <span className="text-blue-400">Q{i + 1} ({answer.domain}):</span> {answer.question}
                  </p>
                  <p className={`text-sm ${answer.isCorrect ? 'text-green-400' : answer.userAnswer === 'skipped' ? 'text-yellow-400' : 'text-red-400'}`}>
                    Your answer: {answer.userAnswer === 'skipped' ? 'Skipped ⏭️' : answer.userAnswer} {answer.isCorrect ? '✅' : answer.userAnswer === 'skipped' ? '⏭️' : '❌'}
                  </p>
                  {(!answer.isCorrect || answer.userAnswer === 'skipped') && (
                    <p className="text-sm text-gray-400">
                      Correct answer: {answer.correctAnswer}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    From: {answer.setInfo.setName} - {answer.setInfo.questionId}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Domain Performance Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-400">Domain Performance:</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              {Object.entries(userAnswers.reduce((acc, answer) => {
                if (!acc[answer.domain]) {
                  acc[answer.domain] = { correct: 0, total: 0 };
                }
                acc[answer.domain].total++;
                if (answer.isCorrect) {
                  acc[answer.domain].correct++;
                }
                return acc;
              }, {})).map(([domain, stats]) => (
                <div key={domain} className="bg-gray-700 p-2 rounded text-center">
                  <p className="font-semibold text-yellow-400">{domain}</p>
                  <p className="text-gray-300">{stats.correct}/{stats.total}</p>
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










