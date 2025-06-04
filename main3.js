let articles;
let scores;
let weakPoints = {};
let questionsByArticle = {};
let highScore;

let streakRecord;
let currentStreak = 0;

let beatStreakRecord = false;
let beatHighScore = false;
let jsonData;

// Custom random float generator function
function getRandomFloat() {
    const val = Math.random() + (Date.now() / 10000000000000);
    return val
  }

function celebrate(text){
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    new Toast(text, Toast.TYPE_DONE);
}

function loadHighScore() {
    highScore = cookie('fr-article-highscore');
    if (highScore == undefined) {
        highScore = 0;
    } else {
        highScore = parseFloat(highScore);
    }
    $('#highscore').text(`Highscore: ${highScore.toFixed(2)}`);
}

function setHighScore(val){
    if (val > highScore) {
        highScore = val;
        cookie.set('fr-article-highscore', highScore);
        $('#highscore').text(`Highscore: ${highScore.toFixed(2)}`);
        if (!beatHighScore && val > 5){
            celebrate(`New high score! ${highScore.toFixed(2)}`);
            beatHighScore = true;
        }
    }
}

function loadStreakScore(){
    let streak = cookie('fr-article-streak');
    if (streak == undefined) {
        streakRecord = 0;
    } else {
        streakRecord = parseInt(streak);
    }
    $('#streak').text(`Longest streak: ${streakRecord}`);
}

function setStreakScores(val){
    $('#current-streak').text(`Current streak: ${val}`);
    if (val > streakRecord) {
        streakRecord = val;
        cookie.set('fr-article-streak', highScore);
        $('#streak').text(`Longest streak: ${streakRecord}`);
        if (!beatStreakRecord  && val > 5){
            celebrate(`New streak record! ${val}`);
            beatStreakRecord = true;
        }
    }
}

function checkTickBoxes() {
    let checked = $('input[name="article"]:checked').length;
    if (checked === 0) {
        alert("Please select at least one article.");
        return false;
    } else {
        let allCheckboxes = $('input[name="article"]').length;
        if (checked === allCheckboxes) {
            alert("No cheating!");
            return false;
        }
    }
    return true;
}

function weighted_random(items, weights) {
    var i;

    for (i = 1; i < weights.length; i++)
        weights[i] += weights[i - 1];
    
    var random = Math.random() * weights[weights.length - 1];
    
    for (i = 0; i < weights.length; i++)
        if (weights[i] > random)
            break;
    
    return items[i];
}


function loadNextQuestion(questionData, i){
    if ($('#smart-shuffle').is(':checked')){
        let articles = Object.keys(weakPoints);
        let weights = Object.values(weakPoints);
        let article = weighted_random(articles, weights);
        displayQuestion(questionData, i+1, article);
    } else {
        displayQuestion(questionData, i+1, null);
    }
}


function displayQuestion(questionData, i, article){
    let answer, query;
    if (article != null){
        query = questionsByArticle[article][i];
        answer = article
    } else {
        question = questionData[i];
        answer = question[0];
        query = question[1];
    }



    // Display question
    $('#question-text').text(query);

    // Attach click handlerl
    $('#submit-button').off('click'); // Remove previous click handler
    $('#submit-button').on('click', function() {
        if (checkTickBoxes()){
            scoreQuestion(answer);
            displayScores();
            loadNextQuestion(questionData, i+1);
        }
    });
}

function scoreQuestion(answer){

    let userAnswer = $('input[name=article]:checkbox:checked').map(function() {
        return this.value;
    }).get();

    let score, feedback, feedbackClass;
    if (userAnswer.indexOf(answer)!==-1) {
        score = (typeof userAnswer === 'object') ? 1 / userAnswer.length : 1;
        console.log(userAnswer, score);

        feedback = "Correct!";
        if (userAnswer.length > 1) {
            feedback += " The answer was " + answer + ".";
        }
        feedbackClass = "correct";
    } else {
        score = 0;
        let text = $('#question-text').text();
        text = text.replace('___', answer);
        feedback = `Incorrect! The correct answer is "${answer}". <br>"${text}"`;
        feedbackClass = "incorrect";
    }
    scores[answer].push(score);
    $('#feedback').empty();
    feedback = `<span class="${feedbackClass}">${feedback}</span>`;
    $('#feedback').append(feedback);
    $('input[name="article"]:checked').prop('checked', false); // Uncheck the selected radio button

    if (score > 0){
        currentStreak++;
    } else {
        currentStreak = 0;
    }
    setStreakScores(currentStreak);
}


function displayScores(){
    let totalCorrect = 0;
    let total = 0;
    table = $('<table></table>');
    $.each(scores, function(k, v){
        let correct = v.reduce((a, b) => a + b, 0);
        let average = correct / v.length;
        if (isNaN(average)) {
            average = 0;
        }
        table.append(
            `<tr><td>${k}</td><td>${correct.toFixed(2)} / ${v.length}</td><td>${(average*100).toFixed(0)}%</td></tr>`
        );
        weakPoints[k] = Math.max(1-average, 0.3);
        total += v.length;
        totalCorrect += correct;
    });

    const perc = `${((totalCorrect/total)*100).toFixed(0)}%`;
    table.prepend(`<tr><td>Total</td><td>${totalCorrect.toFixed(2)} / ${total}</td><td>${perc}</td></tr>`);
    table.prepend('<tr><th>Article</th><th>Score</th><th>Accuracy</th></tr>');

    $('#score').empty();
    $('#score').append(table);
    setHighScore(totalCorrect);
    normWeakpoints();
}

function normWeakpoints(){
    let total = 0;
    $.each(weakPoints, function(k, v){
        total += v;
    });
    if (total === 0){
        return;
    }
    let articles = Object.keys(weakPoints);

    $.each(articles, function(k, v){
        // If k is a string
        if (typeof k === 'string') {
            weakPoints[k] = 1 / total;
        }
    });
}


function main(questionData){
    let i = 0;

    articles = [...new Set($.map(questionData, function(value) {
        return value[0];
    }))].sort();

    scores = articles.reduce(function(obj, x) {
        obj[x] = [];
        return obj;
    }, {});

    $('#options-container').empty();
    // Create radio buttons
    articles.forEach((a) => {
        $('#options-container').prepend(
            `<label>
                <input type="checkbox" name="article" value="${a}"> ${a}
            </label>`
        );
    })
    displayQuestion(questionData, i);
}


function setupShuffleButton() {
    $('#shuffle-button').on('click', function() {
        console.log('click');
        setupQuestions();
    });
}


function setupQuestions(){
    jsonData['qs'].sort(() => (getRandomFloat()-0.5) * 10);
    for (let i=0; i<jsonData['qs'].length; i++){
        let article = jsonData['qs'][i][0];
        let question = jsonData['qs'][i][1];
        if (questionsByArticle[article] === undefined){
            questionsByArticle[article] = [];
        }
        questionsByArticle[article].push(question);
    }
    main(jsonData['qs']);
}


$(document).ready(function(){
    loadHighScore();
    loadStreakScore();
    $.getJSON("./qs.json", function(json) {
        jsonData = json;
        // shuffle array
        setupShuffleButton();
        setupQuestions();
    });
});

