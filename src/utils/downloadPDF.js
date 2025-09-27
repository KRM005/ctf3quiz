// // src/utils/downloadPDF.js
// import jsPDF from "jspdf";

// export default function downloadPDF(resultData) {
//   const doc = new jsPDF();

//   // Title
//   doc.setFontSize(18);
//   doc.text("CTF3 Quiz Report", 105, 20, { align: "center" });

//   // Team info
//   doc.setFontSize(12);
//   doc.text(`Team: ${resultData.teamName}`, 20, 40);
//   doc.text(`Flag Color: ${resultData.flagColor}`, 20, 50);
//   doc.text(`Score: ${resultData.score} / ${resultData.totalQuestions}`, 20, 60);
//   doc.text(`Passed: ${resultData.passed ? "Yes 🎉" : "No ❌"}`, 20, 70);

//   // Duration info
//   if (resultData.durationInSeconds !== null) {
//     doc.text(`Duration: ${resultData.durationInSeconds} seconds`, 20, 80);
//   }

//   // Add summary
//   doc.setFontSize(14);
//   doc.text("Summary", 20, 100);
//   doc.setFontSize(12);
//   let y = 110;
//   Object.entries(resultData.summary).forEach(([key, val]) => {
//     if (typeof val === "object") return; // skip domain breakdown here
//     doc.text(`${key}: ${val}`, 25, y);
//     y += 10;
//   });

//   // Domain breakdown
//   y += 10;
//   doc.setFontSize(14);
//   doc.text("Domain Breakdown", 20, y);
//   y += 10;
//   doc.setFontSize(12);
//   for (const [domain, stats] of Object.entries(resultData.summary.domainBreakdown)) {
//     doc.text(`${domain}: ${stats.correct}/${stats.total}`, 25, y);
//     y += 10;
//     if (y > 270) { // add new page if overflow
//       doc.addPage();
//       y = 20;
//     }
//   }

//   // Add quiz results
//   y += 10;
//   doc.setFontSize(14);
//   doc.text("Detailed Results", 20, y);
//   y += 10;
//   doc.setFontSize(10);
//   resultData.finalQuizResults.forEach((q, i) => {
//     const resultLine = `Q${q.questionNumber} (${q.domain}): ${q.question}
//     Your answer: ${q.userAnswer} | Correct: ${q.correctAnswer} | ${q.isCorrect ? "✅" : "❌"}`;
//     const split = doc.splitTextToSize(resultLine, 170);
//     doc.text(split, 20, y);
//     y += split.length * 5 + 5;

//     if (y > 270) {
//       doc.addPage();
//       y = 20;
//     }
//   });

//   // Save
//   doc.save(`CTF3_Quiz_Results_${resultData.teamName}_${new Date().toISOString().slice(0,10)}.pdf`);
// }












// src/utils/downloadPDF.js
import jsPDF from "jspdf";

/**
 * Convert ISO timestamp to a readable local string (safe fallback)
 */
function formatDate(iso) {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString();
  } catch (e) {
    return iso;
  }
}

/**
 * Generate a multi-page PDF report from the resultData object.
 * This function is defensive (handles missing fields) and wraps long text.
 */
export default function downloadPDF(resultData = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  // Title
  doc.setFontSize(18);
  doc.text("CTF3 Quiz Report", pageWidth / 2, y, { align: "center" });
  y += 28;

  // Basic metadata
  doc.setFontSize(11);
  const meta = [
    `Team: ${resultData.teamName || "N/A"}`,
    `Flag Color: ${resultData.flagColor || "N/A"}`,
    `Score: ${resultData.score ?? "N/A"} / ${resultData.totalQuestions ?? "N/A"}`,
    `Passed: ${resultData.passed ? "Yes" : "No"}`,
    `Start: ${formatDate(resultData.startTimestamp)}`,
    `End: ${formatDate(resultData.endTimestamp)}`,
    `Duration (s): ${resultData.durationInSeconds ?? "N/A"}`,
    `Total Sets Encountered: ${resultData.summary?.totalQuestionSetsEncountered ?? (Array.isArray(resultData.allQuestionSetsInvolved) ? resultData.allQuestionSetsInvolved.length : "N/A")}`,
    `Total Set Changes: ${resultData.totalSetChanges ?? (Array.isArray(resultData.setChangeLog) ? resultData.setChangeLog.length : 0)}`,
    `Used Set IDs: ${Array.isArray(resultData.usedSetIds) ? resultData.usedSetIds.join(", ") : "N/A"}`
  ];

  meta.forEach((line) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 14;
  });

  y += 8;

  // Final Question Set (if present)
  doc.setFontSize(13);
  doc.text("Final Question Set", margin, y);
  y += 16;
  doc.setFontSize(10);
  const fs = resultData.finalQuestionSet;
  if (fs) {
    const setName = fs.setName || fs.name || "N/A";
    const setId = fs.setId || fs.id || "N/A";
    const totalQs = fs.questions ? fs.questions.length : (fs.totalQuestions ?? "N/A");
    if (y > pageHeight - margin) { doc.addPage(); y = margin; }
    doc.text(`Set: ${setName} (${setId})`, margin + 8, y); y += 12;
    doc.text(`Total questions: ${totalQs}`, margin + 8, y); y += 12;

    if (Array.isArray(fs.questions)) {
      fs.questions.forEach((q, i) => {
        if (y > pageHeight - margin - 60) { doc.addPage(); y = margin; doc.setFontSize(10); }
        const qTitle = `${i + 1}. ${q.domain ? `(${q.domain}) ` : ""}${q.id ? `[${q.id}] ` : ""}${(q.question || "").slice(0, 180)}`;
        const qSplit = doc.splitTextToSize(qTitle, pageWidth - margin * 2 - 16);
        doc.text(qSplit, margin + 12, y);
        y += qSplit.length * 11 + 4;
      });
    }
  } else {
    doc.text("None", margin + 8, y);
    y += 16;
  }

  y += 6;

  // All question sets involved
  doc.setFontSize(13);
  doc.text("All Question Sets Involved", margin, y);
  y += 16;
  doc.setFontSize(10);
  if (Array.isArray(resultData.allQuestionSetsInvolved) && resultData.allQuestionSetsInvolved.length) {
    resultData.allQuestionSetsInvolved.forEach((set) => {
      if (y > pageHeight - margin - 60) { doc.addPage(); y = margin; doc.setFontSize(10); }
      const name = set.setName || set.name || "N/A";
      const id = set.setId || set.id || "N/A";
      const totalQ = set.totalQuestions ?? (Array.isArray(set.questions) ? set.questions.length : "N/A");
      const usedFinal = set.wasUsedInFinalQuiz ? "Yes" : "No";
      doc.text(`• ${name} (${id})`, margin + 6, y); y += 12;
      doc.text(`  - Total questions: ${totalQ}`, margin + 14, y); y += 12;
      doc.text(`  - Used in final: ${usedFinal}`, margin + 14, y); y += 14;
    });
  } else {
    doc.text("None", margin + 8, y);
    y += 16;
  }

  y += 6;

  // Set change log
  doc.setFontSize(13);
  doc.text("Set Change Log", margin, y);
  y += 16;
  doc.setFontSize(10);
  if (Array.isArray(resultData.setChangeLog) && resultData.setChangeLog.length) {
    resultData.setChangeLog.forEach((entry, idx) => {
      if (y > pageHeight - margin - 80) { doc.addPage(); y = margin; doc.setFontSize(10); }
      doc.text(`${idx + 1}. ${formatDate(entry.timestamp)}`, margin + 6, y); y += 12;
      doc.text(`   From: ${entry.oldSet?.setName || entry.oldSet?.setId || "N/A"}`, margin + 10, y); y += 11;
      doc.text(`   To:   ${entry.newSet?.setName || entry.newSet?.setId || "N/A"}`, margin + 10, y); y += 11;
      doc.text(`   Reason: ${entry.reasonForChange || "N/A"}`, margin + 10, y); y += 11;
      doc.text(`   Progress at change: ${entry.currentProgress || "N/A"}`, margin + 10, y); y += 14;
    });
  } else {
    doc.text("None", margin + 8, y);
    y += 16;
  }

  y += 6;

  // Domain breakdown
  doc.setFontSize(13);
  doc.text("Domain Breakdown", margin, y);
  y += 16;
  doc.setFontSize(10);
  const domainBreakdown = (resultData.summary && resultData.summary.domainBreakdown) || resultData.domainBreakdown || {};
  if (domainBreakdown && Object.keys(domainBreakdown).length) {
    Object.entries(domainBreakdown).forEach(([domain, stats]) => {
      if (y > pageHeight - margin - 40) { doc.addPage(); y = margin; doc.setFontSize(10); }
      doc.text(`${domain}: ${stats.correct ?? 0} / ${stats.total ?? 0}`, margin + 8, y);
      y += 12;
    });
  } else {
    doc.text("None", margin + 8, y);
    y += 16;
  }

  y += 8;

  // Detailed per-question results
  doc.setFontSize(13);
  doc.text("Detailed Results", margin, y);
  y += 16;
  doc.setFontSize(9);
  const finalResults = resultData.finalQuizResults || resultData.finalQuizResults || resultData.userAnswers || [];
  if (Array.isArray(finalResults) && finalResults.length) {
    finalResults.forEach((q, i) => {
      if (y > pageHeight - margin - 90) { doc.addPage(); y = margin; doc.setFontSize(9); }
      const header = `Q${q.questionNumber ?? i + 1} (${q.domain || "N/A"}) — Set: ${q.setInfo?.setName || q.setInfo?.setId || "N/A"}`;
      doc.text(header, margin, y); y += 11;

      const qText = `Question: ${q.question || "N/A"}`;
      const qSplit = doc.splitTextToSize(qText, pageWidth - margin * 2);
      doc.text(qSplit, margin + 8, y); y += qSplit.length * 10;

      const uaText = `Your answer: ${q.userAnswer}`;
      const uaSplit = doc.splitTextToSize(uaText, pageWidth - margin * 2);
      doc.text(uaSplit, margin + 8, y); y += uaSplit.length * 10;

      const caText = `Correct answer: ${q.correctAnswer}`;
      const caSplit = doc.splitTextToSize(caText, pageWidth - margin * 2);
      doc.text(caSplit, margin + 8, y); y += caSplit.length * 10;

      const resText = `Result: ${q.isCorrect ? "Correct" : (q.userAnswer === "skipped" ? "Skipped" : "Incorrect")}`;
      doc.text(resText, margin + 8, y); y += 14;
    });
  } else {
    doc.text("No question results available.", margin + 8, y);
    y += 16;
  }

  // Footer / generation timestamp
  if (y > pageHeight - margin) { doc.addPage(); y = margin; }
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - margin);

  // Safe filename
  const filenameTeam = (resultData.teamName || "team").replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  doc.save(`CTF3_Quiz_Results_${filenameTeam}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
