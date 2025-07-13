// JEE Advanced CBT Simulator - With Timer, MCQ/MSQ Fix, and Time Analysis
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import './App.css';

const questions = [{
  id: 123456789,
  type: "mcq",
  question: "Identify the correct graph for y = x²",
  image: "/images/triangle-question.png",
  options: [
    { label: "Graph 1", img: "/images/graph1.png" },
    { label: "Graph 2", img: "/images/graph2.png" },
    { label: "Graph 3", img: "/images/graph3.png" },
    { label: "Graph 4", img: "/images/graph4.png" }
  ],
  correct: 0,
  marking: { correct: 3, wrong: -1, unattempted: 0 }
}
]

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export const generateQuestionPDF = async (questions) => {
  const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
const text = "QUESTION PAPER";
const textWidth = doc.getTextWidth(text);
const x = (pageWidth - textWidth) / 2;
doc.text(text, x, 10);
  
  let y = 10;

      y += 10; // Extra space before next question
      y += 10; // Extra space before next question

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (y > 240) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(12);
    doc.text(`${i + 1}. ${q.question}`, 10, y);
    y += 8;

    if (q.image) {
      const base64 = await loadImageAsBase64(q.image);
      if (base64) {
        doc.addImage(base64, 'PNG', 10, y, 60, 40);
        y += 45;
      }
    }

    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      const label = `${String.fromCharCode(65 + j)}. `;

      if (typeof opt === 'object') {
        doc.text(`   ${label}${opt.text || ''}`, 12, y);
        y += 8;

        if (opt.img) {
          const optBase64 = await loadImageAsBase64(opt.img);
          if (optBase64) {
            doc.addImage(optBase64, 'PNG', 15, y, 50, 30);
            y += 35;
          }
        }
      } else {
        doc.text(`   ${label}${opt}`, 12, y);
        y += 8;
      }

      if (y > 240) {
        doc.addPage();
        y = 10;
      }
    }

    y += 10; // Extra space before next question
  }

  doc.save('Question_Paper.pdf');
};


const generateAnswerKeyPDF = (questions) => {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Answer Key", 90, 10);
  doc.setFontSize(12);

  questions.forEach((q, i) => {
    let correctAns;
    if (q.type === "mcq") {
      correctAns = String.fromCharCode(65 + q.correct); // A, B, C, D
    } else if (q.type === "msq") {
      correctAns = q.correct.map(idx => String.fromCharCode(65 + idx)).join(", ");
    } else if (q.type === "integer") {
      correctAns = q.answer || "(not provided)";
    }
    doc.text(`${i + 1}. ${correctAns}`, 10, 20 + i * 10);
  });

  doc.save("Answer_Key.pdf");
};

function App() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [userInfo, setUserInfo] = useState({ name: '', id: '' });
  const [infoSubmitted, setInfoSubmitted] = useState(false);
  const [responses, setResponses] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [review, setReview] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60 * 30);
  const [perQuestionTime, setPerQuestionTime] = useState(Array(questions.length).fill(0));
  const lastTimestampRef = useRef(Date.now());


  useEffect(() => {
    if (userInfo.id) {
      const storedTime = localStorage.getItem(`jee-time-left-${userInfo.id}`);
      const storedSubmitted = localStorage.getItem(`jee-submitted-${userInfo.id}`);
      const storedPerQ = localStorage.getItem(`jee-per-question-time-${userInfo.id}`);

      if (storedTime) setTimeLeft(parseInt(storedTime));
      if (storedSubmitted === 'true') setSubmitted(true);
      if (storedPerQ) setPerQuestionTime(JSON.parse(storedPerQ));
    }
  }, [userInfo.id]);

useEffect(() => {
  if (!submitted && !showInstructions && userInfo.id) {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - lastTimestampRef.current) / 1000);

      if (diff > 0) {
        lastTimestampRef.current = now;

        setTimeLeft((prev) => {
          const newTime = prev - diff;
          if (newTime <= 0) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          } else {
            localStorage.setItem(`jee-time-left-${userInfo.id}`, String(newTime));
            return newTime;
          }
        });

        setPerQuestionTime((prev) => {
          const updated = [...prev];
          updated[currentQ] += diff;
          localStorage.setItem(`jee-per-question-time-${userInfo.id}`, JSON.stringify(updated));
          return updated;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }
}, [submitted, currentQ, showInstructions, userInfo.id]);

  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();
    const blockKeys = (e) => {
      const blockedCombos = [
        { key: 'F12' },
        { key: 'u', ctrlKey: true },
        { key: 'i', ctrlKey: true, shiftKey: true },
        { key: 'c', ctrlKey: true, shiftKey: true },
        { key: 'j', ctrlKey: true, shiftKey: true },
        { key: 'Tab', altKey: true },
        { key: 'Tab', ctrlKey: true },
        { key: 'Escape' }
      ];
      const blocked = blockedCombos.some(combo =>
        Object.keys(combo).every(k => e[k] === combo[k])
      );
      if (blocked) {
        e.preventDefault();
        alert("This action is disabled during the test.");
      }
    };
    const enforceFullScreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    };
    const onBlur = () => {
      alert("Switching tabs is not allowed during the test.");
    };
    if (!showInstructions && !submitted) {
      document.addEventListener('contextmenu', disableContextMenu);
      document.addEventListener('keydown', blockKeys);
      window.addEventListener('blur', onBlur);
      enforceFullScreen();
    }
    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', blockKeys);
      window.removeEventListener('blur', onBlur);
    };
  }, [showInstructions, submitted]);

const handleSubmit = () => {
  const result = evaluate();
  setAnalysis(result);
  setSubmitted(true);

  fetch('https://script.google.com/macros/s/AKfycbyou7qD7XJxtKMVHFs-maFpwE1qRC8j8hRKZ4Jnludvy0TNa3oOVjjO_mvMKg99bfODEQ/exec', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: userInfo.name,
    id: userInfo.id,
    score: result.score,
    correct: result.correct,
    wrong: result.wrong,
    answers: result.questionResults
  }),
  mode: 'no-cors'  // Required to bypass CORS issue on localhost
})
.then(() => console.log("✅ Submitted to Google Sheet"))
.catch(err => console.error("❌ Submission failed:", err));

  localStorage.setItem(`jee-submitted-${userInfo.id}`, 'true');
};


  if (showInstructions) {
    return (
      <div className="instructions-screen">
        <div className="info-form">
          <h2>Enter Your Details</h2>
          <input
            placeholder="Enter your name"
            value={userInfo.name}
            onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
          />
          <input
            placeholder="Enter your ID number"
            value={userInfo.id}
            onChange={(e) => setUserInfo({ ...userInfo, id: e.target.value })}
          />
        </div>
        <h2>📘 Instructions</h2>
        <ul>
          <li>This is a 30-minute test with MCQ, MSQ, and Integer-type questions.</li>
          <li>Navigate through questions using the panel on the left.</li>
          <li>Use "Mark for Review" to mark uncertain questions.</li>
          <li>The timer will begin once you click Start.</li>
          <li>Once submitted, you cannot retake the test.</li>
        </ul>
        <button
          className="start-btn"
          onClick={() => {
            if (userInfo.name && userInfo.id) setShowInstructions(false);
          }}
        >
          Start Test
        </button>
      </div>
    );
  }



  const handleMCQ = (index) => {
    const selected = responses[currentQ]?.[0];
    if (selected === index) {
      const updated = { ...responses };
      delete updated[currentQ];
      setResponses(updated);
    } else {
      setResponses({ ...responses, [currentQ]: [index] });
    }
  };

  const handleMSQ = (index) => {
    const prev = responses[currentQ] || [];
    if (prev.includes(index)) {
      const filtered = prev.filter((i) => i !== index);
      const updated = { ...responses };
      if (filtered.length === 0) delete updated[currentQ];
      else updated[currentQ] = filtered;
      setResponses(updated);
    } else {
      setResponses({ ...responses, [currentQ]: [...prev, index] });
    }
  };

  const handleInteger = (e) => {
    setResponses({ ...responses, [currentQ]: e.target.value });
  };

  const getStatus = (qIdx) => {
    if (review[qIdx]) return "review";
    const ans = responses[qIdx];
    if (ans === undefined || (Array.isArray(ans) && ans.length === 0) || ans === "") {
      return "unanswered";
    }
    return "answered";
  };

  const toggleReview = () => {
    setReview((prev) => ({ ...prev, [currentQ]: !prev[currentQ] }));
  };

  const evaluate = () => {
    let score = 0;
    let correct = 0, wrong = 0, partial = 0, unattempted = 0, attempted = 0;
    const questionResults = [];

    questions.forEach((q, i) => {
      const userAns = responses[i];
      let qScore = 0;
      let status = "unattempted";

      if (userAns === undefined || userAns.length === 0) {
        qScore = q.marking.unattempted || 0;
        unattempted++;
      } else {
        attempted++;
        if (q.type === 'mcq') {
          if (userAns[0] === q.correct) {
            qScore = q.marking.correct;
            correct++;
            status = "correct";
          } else {
            qScore = q.marking.wrong;
            wrong++;
            status = "wrong";
          }
        } else if (q.type === 'integer') {
          if (String(userAns).trim() === q.answer) {
            qScore = q.marking.correct;
            correct++;
            status = "correct";
          } else {
            qScore = q.marking.wrong;
            wrong++;
            status = "wrong";
          }
        } else if (q.type === 'msq') {
          const correctSet = new Set(q.correct);
          const userSet = new Set(userAns);

          if ([...userSet].some((opt) => !correctSet.has(opt))) {
            qScore = q.marking.wrong;
            wrong++;
            status = "wrong";
          } else if (correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x))) {
            qScore = q.marking.correct;
            correct++;
            status = "correct";
          } else {
            qScore = userAns.length * q.marking.partial;
            partial++;
            status = "partial";
          }
        }
      }

      score += qScore;
      questionResults.push({
  number: i + 1,
  question: q.question,
  status,
  score: qScore,
  timeSpent: perQuestionTime[i],
  userAnswer: userAns, // NEW LINE
});

    });

    return { score, correct, wrong, partial, unattempted, attempted, questionResults };
  };


  const curr = questions[currentQ];

  return (
    <div className="app app-container">
      <div className="sidebar expanded">
        <h3>Question Panel</h3>
        <div className="grid question-grid">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`btn ${getStatus(i)}`}
              onClick={() => setCurrentQ(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="timer-display">Time Left: {formatTime(timeLeft)}</div>
        <button className="submit-btn" onClick={() => {
          if (window.confirm('Are you sure you want to submit the test?')) handleSubmit();
        }}>
          Submit Test
        </button>
      </div>

      <div className="question-box expanded-box">
        {submitted && analysis ? (
          <div className="result-section">
  <h2>Test Submitted</h2>
  <p className="score-display">Total Score: <strong>{analysis.score}</strong></p>

  {/* ADD THIS BELOW */}
  <div className="pdf-buttons">
    <button onClick={() => generateQuestionPDF(questions)}>📄 Download Question Paper</button>
    <button onClick={() => generateAnswerKeyPDF(questions)}>✅ Download Answer Key</button>
  </div>

  <div className="summary">
    <p>Attempted: {analysis.attempted}</p>
    <p>Correct: {analysis.correct}</p>
    <p>Wrong: {analysis.wrong}</p>
    <p>Partial: {analysis.partial}</p>
    <p>Unattempted: {analysis.unattempted}</p>
  </div>

            <h3>Question-wise Analysis:</h3>
<ul>
  {analysis.questionResults.map((q, idx) => (
    <li key={idx}>
      <strong>Q{q.number}</strong> - {q.status.toUpperCase()} | Marks: {q.score} | Time Spent: {formatTime(q.timeSpent)}<br />
      <span>
        ✅ <strong>Correct Answer:</strong> {
          Array.isArray(questions[idx].correct)
            ? questions[idx].correct.map(i => String.fromCharCode(65 + i)).join(', ')
            : questions[idx].type === 'integer'
              ? questions[idx].answer
              : String.fromCharCode(65 + questions[idx].correct)
        }
      </span>
      <br />
      <span>
         <strong>Your Answer:</strong> {
          q.status === 'unattempted'
            ? '—'
            : Array.isArray(q.userAnswer)
              ? q.userAnswer.map(i => String.fromCharCode(65 + i)).join(', ')
              : questions[idx].type === 'integer'
                ? q.userAnswer
                : String.fromCharCode(65 + q.userAnswer)
        }
      </span>
    </li>
  ))}
</ul>

          </div>
        ) : (
          <>
            <div className="question-top">
              <h2 className="question-title">Question {currentQ + 1}</h2>
              <p className="question-text">{curr.question}</p>
              {curr.image && (
                <div className="question-image-wrapper">
                  <img src={curr.image} alt="question-img" className="question-img" />
                </div>
              )}

{curr.type === "mcq" &&
  curr.options.map((opt, i) => {
    const isSelected = responses[currentQ]?.[0] === i;
    const isObject = typeof opt === 'object';
    return (
      <div
        key={i}
        className={`option custom-radio ${isSelected ? "selected" : ""}`}
        onClick={() => handleMCQ(i)}
      >
        {isObject && opt.img ? (
          <div className="option-content">
            <span>{opt.text}</span>
            <img src={opt.img} alt={`option-${i}`} className="option-img" />
          </div>
        ) : (
          opt
        )}
      </div>
    );
  })}

{curr.type === "msq" &&
  curr.options.map((opt, i) => {
    const isSelected = responses[currentQ]?.includes(i);
    const isObject = typeof opt === 'object';
    return (
      <div
        key={i}
        className={`option custom-checkbox ${isSelected ? "selected" : ""}`}
        onClick={() => handleMSQ(i)}
      >
        {isObject && opt.img ? (
          <div className="option-content">
            <span>{opt.text}</span>
            <img src={opt.img} alt={`option-${i}`} className="option-img" />
          </div>
        ) : (
          opt
        )}
      </div>
    );
  })}


              {curr.type === "integer" && (
                <input
                  type="number"
                  className="integer-input large-input"
                  value={responses[currentQ] || ""}
                  onChange={handleInteger}
                />
              )}
            </div>

            <div className="actions fixed-actions">
              <button onClick={toggleReview} className="review-btn">
                {review[currentQ] ? "Unmark Review" : "Mark for Review"}
              </button>
              <button
                onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                disabled={currentQ === 0}
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
                disabled={currentQ === questions.length - 1}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

