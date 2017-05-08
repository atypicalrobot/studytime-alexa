var Alexa = require('alexa-sdk');
var http = require('http');

var states = {  //
    ANSWERMODE: '_ANSWERMODE', // User is trying to answer a question
    QUESTIONMODE: '_QUESTIONMODE', // Alexa asks the user the question
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};

var letters = ['A', 'B', 'C', 'D'];
var correct_cheering = ['Great answer!', 'Fantastic!', 'Brilliant.','Perfect.','Well Done!', 'Awesome.', 'You got it!','Nice one.','Spot on.', 'Correct.', 'Yayyy, that is correct!'];
var wrong_cheering = ['Aww, sorry.', 'Sorry, but the answer is incorrect.', 'Sorry, wrong answer.', 'Sorry, you will get it next time.', 'Sorry, better luck next time.'];


var newSessionHandlers = {

     // This will short-cut any incoming intent or launch requests and route them to this handler.
    'NewSession': function() {
        this.handler.state = states.STARTMODE;
        this.emit(':askWithLinkAccountCard', 'Welcome to study time. Say new to start or exit to leave.', 'say new or exit.');
    }

};

var subjectHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    //this function asks a question about subjects
    'SubjectIntent': function () {
        var intentObj = this.event.request.intent;
        this.handler.state = states.QUESTIONMODE;
        console.log(this.handler.state);
        this.attributes.qid = 0;
        this.emit(':ask', 'What subject would you like to answer questions on? English, Maths, or Science', 'English, Maths, or Science?');
    },

    'Unhandled': function() {
        var message = 'Sorry I did not understand. Please say new to start a new quiz.';
        this.emit(':ask', message, message);
    }

});

function speakQuestion(question, choices) {
    output = question.prompt_text + ' <break time="0.3s"/> ';
    choices.forEach(function (value, i) {
        console.log('%d: %s', i, value);
        var extra = '';
        if(letters[i] == 'D'){
            extra = ' or ';
        }
        output += '<emphasis level="moderate">' + extra + letters[i] +' </emphasis>' + ', ' + value + '<break time="0.3s"/> ';
    });
    return output;
}

var questionHandlers = Alexa.CreateStateHandler(states.QUESTIONMODE, {
    //this function fetches a question from an api and displays it
    'QuestionIntent': function () {
        // var intentObj = this.event.request.intent;
        // var subject = intentObj.slots.Subject.value;
        // console.log(subject)
        var cardTitle = "Question";
        var cardContent = "Data provided by Open TB\n\n";
        var qid = this.attributes.qid;
        console.log('QuestionIntent triggered.')
        var output;
        if (qid == 0) {
            console.log('Fetching questions as this is the first run.');
            httpGet('/api/multiplechoicequiz/1/', function (response) {
                // Parse the response into a JSON object ready to be formatted.
                var responseData = JSON.parse(response);
                // Check if we have correct data, If not create an error speech out to try again.
                if (responseData == null) {
                    output = "There was a problem fetching question data, please try again";
                }
                else {
                    this.attributes.questions = responseData.questions;
                    var question = this.attributes.questions[qid];
                    output = speakQuestion(question, question.answer.choices)
                    this.handler.state = states.ANSWERMODE;
                    this.emit(':askWithCard', output, cardTitle, cardContent);
                }
            }.bind(this));
        }
        else {
            var question = this.attributes.questions[qid];
            output = speakQuestion(question, question.answer.choices)
            this.handler.state = states.ANSWERMODE;
            this.emit(':askWithCard', this.attributes['answerOutput'] + output, cardTitle, cardContent);
        }

    },

    'Unhandled': function() {
        var message = 'Sorry I did not understand. Please say either English, Maths or Science.';
        this.emit(':ask', message, message);
    }

 });

var answerHandlers = Alexa.CreateStateHandler(states.ANSWERMODE, {

    'AnswerIntent': function () {
        console.log('AnswerIntent triggered.')
        var intentObj = this.event.request.intent;
        var answer = intentObj.slots.Answer.value;
        var qid = this.attributes.qid;
        var question = this.attributes.questions[qid];
        var randCorrect = correct_cheering[Math.floor(Math.random() * correct_cheering.length)];
        var randWrong = wrong_cheering[Math.floor(Math.random() * wrong_cheering.length)];
        // answer - either A, B, C or D from the user.
        // question - the question from our API
        // letters - list of A, B, C or D
        // correctAnswerIndex(correctAnswer, choices) returns index.
        // do a comparison of some kind.
        console.log('correct answer: ' + question.answer.answers[0])
        console.log('choices: ' + question.answer.choices)
        var correctIndex = correctAnswerIndex(question.answer.answers[0], question.answer.choices);
        console.log(correctIndex);
        var correctLetter = letters[correctIndex];
        console.log(correctLetter);
        var result = randWrong;
        if(correctLetter.toString() == answer.toString()){
            result = randCorrect;
        }
        console.log('Setting state to QUESTIONMODE')
        this.handler.state = states.QUESTIONMODE;
        console.log('Incrementing qid')
        this.attributes.qid += 1;
        // this.emit(':tell', result + ' ' + question.answer.answers);
        this.attributes['answerOutput'] = result + ' ' + question.answer.answers + ' <break time="0.2s"/> next question <break time="0.2s"/>' 
        console.log('AnswerIntent Emitting.')
        this.emitWithState('QuestionIntent');
    },

    'AMAZON.RepeatIntent': function() {
        var qid = this.attributes.qid;
        var question = this.attributes.questions[qid];
        this.emitWithState('QuestionIntent');
    },

    'Unhandled': function() {
        var message = 'Sorry I did not understand. Please say either A, B, C or D.';
        this.emit(':ask', message, message);
    }

});


function httpGet(query, callback) {
  console.log("QUERY: " + 'ad1388ed.ngrok.io' + query);

    var options = {
      //http://api.nytimes.com/svc/search/v2/articlesearch.json?q=seattle&sort=newest&api-key=
        host: 'ad1388ed.ngrok.io',
        path: query,
        method: 'GET'
    };

    var req = http.request(options, (res) => {
        var body = '';
        res.on('data', (d) => {
            body += d;
        });
        res.on('end', function () {
            callback(body);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });
}

function correctAnswerIndex(answer, choices) {
    var retValue;
    choices.forEach(function (choice, i) {
        if (answer.toString() == choice.toString() ) {
            console.log('correct index: ' + i)
            retValue = i;
        }
    });
    return retValue;
}

 exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, subjectHandlers, questionHandlers, answerHandlers);
    alexa.execute();
};