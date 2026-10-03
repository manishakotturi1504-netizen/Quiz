const KEY_Q="qm_questions", KEY_R="qm_results", KEY_S="qm_settings", KEY_STATE="qm_current_state";
let questions=[], results=[], settings={minutes:10};
let role="", currentQuestion=0, answers=[], timerInterval=null, quizStart=0, submitted=false;

const samples=[
["What does HTML stand for?",["Hyper Text Markup Language","High Text Machine Language","Hyperlink Text Management Language","Home Tool Markup Language"],0,"Basic"],
["Which language is used to style web pages?",["Python","CSS","Java","SQL"],1,"Basic"],
["Which one is a JavaScript data type?",["Boolean","Browser","Bootstrap","Button"],0,"Basic"],
["What does CPU stand for?",["Central Process Unit","Central Processing Unit","Computer Personal Unit","Control Program Utility"],1,"Basic"],
["Which symbol is commonly used for a JavaScript single-line comment?",["//","##","<!--","**"],0,"Basic"],
["What does DOM stand for?",["Document Object Model","Data Object Method","Digital Ordinance Model","Document Order Mode"],0,"Intermediate"],
["Which Bootstrap class creates a primary button?",["btn-main","button-primary","btn btn-primary","primary-button"],2,"Intermediate"],
["Which HTTP method is commonly used to send form data?",["GET","POST","READ","SEND"],1,"Intermediate"],
["What is an array?",["A collection of values","A browser","A CSS property","A database server"],0,"Intermediate"],
["Which keyword creates a block-scoped constant in JavaScript?",["var","let","const","fixed"],2,"Intermediate"],
["What is event delegation?",["Handling events on a parent element for its children","Deleting browser events","Creating CSS events","Stopping all events"],0,"Hard"],
["What is the main purpose of async/await?",["To simplify asynchronous JavaScript","To style HTML","To create databases","To compress images"],0,"Hard"],
["What is the difference between == and === in JavaScript?",["=== also checks type","== always checks type","They are identical","=== only works with strings"],0,"Hard"],
["What is a REST API mainly used for?",["Communication between applications over HTTP","Designing logos","Playing audio","Creating CSS animations"],0,"Hard"],
["Which statement about const is correct?",["Its binding cannot be reassigned","It can never contain objects","It is always global","It is only for numbers"],0,"Hard"]
];

function $(id){return document.getElementById(id)}
function loadData(){
  questions=JSON.parse(localStorage.getItem(KEY_Q)||"null")||samples.map((s,i)=>({id:i+1,text:s[0],options:s[1],correct:s[2],difficulty:s[3]}));
  results=JSON.parse(localStorage.getItem(KEY_R)||"[]");
  settings=JSON.parse(localStorage.getItem(KEY_S)||'{"minutes":10}');
  localStorage.setItem(KEY_Q,JSON.stringify(questions));
}
function saveData(){localStorage.setItem(KEY_Q,JSON.stringify(questions));localStorage.setItem(KEY_R,JSON.stringify(results));}
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$(id).classList.add("active");window.scrollTo(0,0)}
function goHome(){stopTimer();submitted=true;localStorage.removeItem(KEY_STATE);showScreen("homeScreen")}
function showLogin(r){
  role=r; showScreen("loginScreen");
  $("loginTitle").textContent=r==="admin"?"Admin Login":"Student Login";
  $("loginSubtitle").textContent=r==="admin"?"Sign in to manage questions and results.":"Enter your details to start the quiz.";
  $("studentFields").classList.toggle("d-none",r==="admin");$("adminFields").classList.toggle("d-none",r!=="admin");$("adminHint").classList.toggle("d-none",r!=="admin");
  $("loginIcon").innerHTML=r==="admin"?'<i class="bi bi-shield-lock-fill"></i>':'<i class="bi bi-person-fill"></i>';
}
function handleLogin(e){
  e.preventDefault();
  if(role==="admin"){
    if($("adminUser").value==="admin" && $("adminPass").value==="admin123"){renderAdmin();showScreen("adminScreen")}
    else toast("Incorrect admin username or password.");
  }else{
    const name=$("studentName").value.trim(), id=$("studentId").value.trim();
    if(!name||!id){toast("Please enter your name and student ID.");return}
    if(!questions.length){toast("No questions are available.");return}
    startQuiz({name,id});
  }
}
function renderAdmin(){
  $("totalQuestions").textContent=questions.length;
  $("totalStudents").textContent=new Set(results.map(r=>r.studentId)).size;
  $("totalAttempts").textContent=results.length;
  $("adminQuizTime").textContent=settings.minutes+"m";
  $("quizMinutes").value=settings.minutes;
  $("questionTable").innerHTML=questions.map((q,i)=>`<tr>
    <td>${i+1}</td><td class="question-cell">${escapeHtml(q.text)}</td>
    <td><span class="badge ${q.difficulty==="Basic"?"text-bg-success":q.difficulty==="Intermediate"?"text-bg-warning":"text-bg-danger"}">${q.difficulty}</span></td>
    <td><button class="btn btn-sm btn-outline-primary me-1" onclick="editQuestion(${q.id})"><i class="bi bi-pencil"></i></button>
    <button class="btn btn-sm btn-outline-danger" onclick="deleteQuestion(${q.id})"><i class="bi bi-trash"></i></button></td></tr>`).join("");
  $("resultsTable").innerHTML=results.length?results.slice().reverse().map(r=>`<tr><td>${escapeHtml(r.name)}</td><td>${r.score}/${r.total}</td><td>${r.percent}%</td><td>${r.correct}</td><td>${formatTime(r.timeTaken)}</td></tr>`).join(""):'<tr><td colspan="5" class="text-muted text-center">No results yet.</td></tr>';
}
function saveQuestion(e){
  e.preventDefault();
  const id=Number($("editQuestionId").value);
  const q={id:id||Date.now(),text:$("questionText").value.trim(),options:[$("optionA").value.trim(),$("optionB").value.trim(),$("optionC").value.trim(),$("optionD").value.trim()],correct:Number($("correctAnswer").value),difficulty:$("difficulty").value};
  if(id) questions=questions.map(x=>x.id===id?q:x); else questions.push(q);
  saveData();clearQuestionForm();renderAdmin();toast(id?"Question updated.":"Question added.");
}
function editQuestion(id){
  const q=questions.find(x=>x.id===id);if(!q)return;
  $("editQuestionId").value=q.id;$("questionText").value=q.text;
  [$("optionA").value,$("optionB").value,$("optionC").value,$("optionD").value]=q.options;
  $("correctAnswer").value=q.correct;$("difficulty").value=q.difficulty;
  $("saveQuestionBtn").textContent="Update Question";$("cancelEditBtn").classList.remove("d-none");window.scrollTo({top:0,behavior:"smooth"});
}
function clearQuestionForm(){
  $("editQuestionId").value="";["questionText","optionA","optionB","optionC","optionD"].forEach(x=>$(x).value="");
  $("correctAnswer").value="0";$("difficulty").value="Basic";$("saveQuestionBtn").textContent="Add Question";$("cancelEditBtn").classList.add("d-none");
}
function deleteQuestion(id){
  if(confirm("Delete this question?")){questions=questions.filter(q=>q.id!==id);saveData();renderAdmin();toast("Question deleted.");}
}
function saveSettings(){
  const n=Math.max(1,Math.min(120,Number($("quizMinutes").value)||10));settings.minutes=n;localStorage.setItem(KEY_S,JSON.stringify(settings));renderAdmin();toast("Quiz time saved: "+n+" minutes.");
}
function loadSampleQuestions(){
  if(confirm("Replace the question bank with the sample beginner-to-hard questions?")){
    questions=samples.map((s,i)=>({id:i+1,text:s[0],options:s[1],correct:s[2],difficulty:s[3]}));saveData();renderAdmin();toast("Sample questions restored.");
  }
}
function startQuiz(student){
  submitted=false;currentQuestion=0;answers=new Array(questions.length).fill(null);quizStart=Date.now();
  localStorage.setItem(KEY_STATE,JSON.stringify({student,answers,quizStart}));
  $("studentWelcome").textContent="Welcome, "+student.name;
  showScreen("studentScreen");startTimer();loadQuestion();
}
function loadQuestion(){
  const q=questions[currentQuestion];if(!q)return;
  $("questionNumber").textContent=`Question ${currentQuestion+1} of ${questions.length}`;
  $("levelBadge").textContent=q.difficulty;
  $("levelBadge").className="badge "+(q.difficulty==="Basic"?"bg-success":q.difficulty==="Intermediate"?"bg-warning text-dark":"bg-danger");
  $("quizQuestion").textContent=q.text;
  $("optionsBox").innerHTML=q.options.map((o,i)=>`<label class="option ${answers[currentQuestion]===i?"selected":""}">
    <input type="radio" name="answer" value="${i}" ${answers[currentQuestion]===i?"checked":""} onchange="selectAnswer(${i})">
    <span><strong>${String.fromCharCode(65+i)}.</strong> ${escapeHtml(o)}</span></label>`).join("");
  $("prevBtn").disabled=currentQuestion===0;
  $("nextBtn").classList.toggle("d-none",currentQuestion===questions.length-1);
  $("submitBtn").classList.toggle("d-none",currentQuestion!==questions.length-1);
  $("answeredCount").textContent=answers.filter(x=>x!==null).length+" answered";
  $("quizProgress").style.width=((currentQuestion+1)/questions.length*100)+"%";
  const card=$("questionCard");card.classList.remove("swap");void card.offsetWidth;card.classList.add("swap");
}
function selectAnswer(i){answers[currentQuestion]=i;loadQuestion();$("questionCard").classList.remove("swap")}
function nextQuestion(){if(currentQuestion<questions.length-1){currentQuestion++;loadQuestion()}}
function previousQuestion(){if(currentQuestion>0){currentQuestion--;loadQuestion()}}
function startTimer(){
  stopTimer();updateTimer();timerInterval=setInterval(updateTimer,250);
}
function updateTimer(){
  if(submitted)return;
  const total=settings.minutes*60*1000, elapsed=Date.now()-quizStart, remain=Math.max(0,total-elapsed);
  const sec=Math.ceil(remain/1000),m=Math.floor(sec/60),s=sec%60;
  $("timer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  $("timerBox").classList.toggle("warning",sec<=60&&sec>10);$("timerBox").classList.toggle("danger",sec<=10);
  if(remain<=0){$("timer").textContent="00:00";submitQuiz(true)}
}
function stopTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null}}
function confirmExitQuiz(){if(confirm("Exit the quiz? Your current attempt will be lost.")){goHome()}}
function submitQuiz(auto){
  if(submitted)return;submitted=true;stopTimer();
  const total=questions.length,correct=answers.reduce((n,a,i)=>n+(a===questions[i].correct?1:0),0);
  const unanswered=answers.filter(a=>a===null).length,wrong=total-correct-unanswered;
  const elapsed=Math.min(Date.now()-quizStart,settings.minutes*60*1000),percent=Math.round(correct/total*100);
  const student=JSON.parse(localStorage.getItem(KEY_STATE)||"{}").student||{name:"Student",id:""};
  const result={name:student.name,studentId:student.id,score:correct,total,correct,wrong,unanswered,percent,timeTaken:elapsed,date:new Date().toLocaleString()};
  results.push(result);saveData();localStorage.removeItem(KEY_STATE);showResult(result,auto);
}
function showResult(r,auto){
  $("resultStudent").textContent=`${r.name} • ${r.studentId}`;
  $("resultPercent").textContent=r.percent+"%";$("resultScore").textContent=r.score+"/"+r.total;$("resultCorrect").textContent=r.correct;
  $("resultWrong").textContent=r.wrong;$("resultUnanswered").textContent=r.unanswered;$("resultTime").textContent=formatTime(r.timeTaken);
  $("resultMessage").textContent=auto?"Time is up. Your quiz was automatically submitted.":r.percent>=80?"Excellent work!":"Good effort! Review the questions and try again.";
  showScreen("resultScreen");
}
function formatTime(ms){let s=Math.floor(ms/1000),m=Math.floor(s/60);s%=60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function logout(){goHome()}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

loadData();
