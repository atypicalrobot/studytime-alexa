var Alexa = require('alexa-sdk');
var http = require('http');

var states = {  //
    ANSWERMODE: '_ANSWERMODE', // User is trying to answer a question
    QUESTIONMODE: '_QUESTIONMODE', // Alexa asks the user the question
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
    ENDMODE: '_ENDMODE'  // Prompt the user to restart / exit at the end of the game
};

var letters = ['A', 'B', 'C', 'D'];
var correct_speechcons = [
    'ace!',
    'awesome!',
    'bam!',
    'bang!',
    'bazinga!',
    'bingo!',
    'booya!',
    'bravo!',
    'eureka!',
    'fancy that!',
    'hip hip hooray!',
    'hurrah',
    'hurray',
    'huzzah',
    'jiminy cricket',
    'kablam!',
    'kaboom!',
    'kapow!',
    'no way!',
    'ooh la la!',
    'phew!',
    'pow!',
    'simples!',
    'ta da!',
    'way to go!',
    'well done!',
    'well well!',
    'wham!',
    'whammo!',
    'woo hoo!',
    'wow!',
    'wowza!',
    'yipee!',
    'you bet!',
    'yipee!'
];
var correct_cheering = ['great answer!', 'that is correct!', 'you are right!','you are good at this!', 'look at you go!', 'correct!', 'affirmative!'];
var wrong_cheering = ['Aww, sorry.', 'Sorry, but the answer is incorrect.', 'Sorry, wrong answer.', 'Sorry, you will get it next time.', 'Sorry, better luck next time.'];


var newSessionHandlers = {

     // This will short-cut any incoming intent or launch requests and route them to this handler.
    'NewSession': function() {
        console.log('Setting state to STARTMODE');
        this.handler.state = states.STARTMODE;
        this.emit(':askWithLinkAccountCard', 'Welcome to study time. Say new to start or exit to leave.', 'say new or exit.');
    }

};

var subjectHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    //this function asks a question about subjects
    'SubjectIntent': function () {
        var intentObj = this.event.request.intent;
        console.log('Setting state to QUESTIONMODE');
        this.handler.state = states.QUESTIONMODE;
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
        console.log('QuestionIntent triggered.');
        var output;
        if (qid === 0) {
            console.log('Fetching questions as this is the first run.');
            httpGet('/api/multiplechoicequiz/1/', function (response) {
                // Parse the response into a JSON object ready to be formatted.
                console.log('RESPONSE: ' + response);
                // try {
                //     a = JSON.parse(response);
                // } catch(e) {
                //     alert(e); // error in the above string (in this case, yes)!
                // }
                var responseData = JSON.parse(response);
                // Check if we have correct data, If not create an error speech out to try again.
                if (responseData === null) {
                    output = "There was a problem fetching question data, please try again";
                }
                else {
                    this.attributes.questions = responseData.questions;
                    var question = this.attributes.questions[qid];
                    output = speakQuestion(question, question.answer.choices);
                    console.log('Setting state to ANSWERMODE');
                    this.handler.state = states.ANSWERMODE;
                    this.emit(':askWithCard', output, question.reprompt_text, cardTitle, cardContent);
                }
            }.bind(this));
        }
        else {
            var question = this.attributes.questions[qid];
            // we need to check if we have another question to ask, if not go to end game state.
            if(question){
                output = 'next question <break time="0.2s"/> ' + speakQuestion(question, question.answer.choices);
                console.log('Setting state to ANSWERMODE');
                this.handler.state = states.ANSWERMODE;
                this.emit(':askWithCard', this.attributes.answerOutput + output, cardTitle, cardContent);

            } else {
                output = this.attributes.answerOutput + ' you have reached the end of the quiz, say new to play again or exit to leave.';
                console.log('Setting state to ENDMODE');
                this.handler.state = states.ENDMODE;
                this.emit(':askWithCard', output, cardTitle, cardContent);
            }
        }

    },

    'Unhandled': function() {
        var message = 'Sorry I did not understand. Please say either English, Maths or Science.';
        this.emit(':ask', message, message);
    }

 });

var answerHandlers = Alexa.CreateStateHandler(states.ANSWERMODE, {

    'AnswerIntent': function () {
        console.log('AnswerIntent triggered.');
        var intentObj = this.event.request.intent;
        // answer - either A, B, C or D from the user.
        var answer = intentObj.slots.Answer.value;
        // qid - question ID
        var qid = this.attributes.qid;
        // question - the question from our API
        var question = this.attributes.questions[qid];
        // add some personality
        var randCorrect = correct_cheering[Math.floor(Math.random() * correct_cheering.length)];
        var randCorrectSpeechconTmp = correct_speechcons[Math.floor(Math.random() * correct_speechcons.length)];
        var randCorrectSpeechcon = '<say-as interpret-as="interjection">' + randCorrectSpeechconTmp + '!</say-as>, ';
        var randWrong = wrong_cheering[Math.floor(Math.random() * wrong_cheering.length)];
        console.log('correct answer: ' + question.answer.answers[0]);
        console.log('choices: ' + question.answer.choices);
        // correctAnswerIndex(correctAnswer, choices) returns index.
        var correctIndex = correctAnswerIndex(question.answer.answers[0], question.answer.choices);
        console.log(correctIndex);
        // letters - list of A, B, C or D
        var correctLetter = letters[correctIndex];
        console.log(correctLetter);
        var result = randWrong;
        if(correctLetter.toString().toLowerCase() == answer.toString().toLowerCase()){
            result = randCorrectSpeechcon + randCorrect;
        }
        console.log('Setting state to QUESTIONMODE');
        this.handler.state = states.QUESTIONMODE;
        console.log('Incrementing qid');
        this.attributes.qid += 1;
        // this.emit(':tell', result + ' ' + question.answer.answers);
        this.attributes.answerOutput = result + ' the answer is ' + question.answer.answers + '. <break time="0.2s"/>';
        console.log('AnswerIntent Emitting.');
        this.emitWithState('QuestionIntent');
    },

    'AMAZON.RepeatIntent': function() {
        var qid = this.attributes.qid;
        var question = this.attributes.questions[qid];
        console.log('Setting state to QUESTIONMODE');
        this.handler.state = states.QUESTIONMODE;
        this.emitWithState('QuestionIntent');
    },

    'Unhandled': function() {
        var message = 'Sorry I did not understand. Please say either A, B, C, D or ask me to repeat.';
        this.emit(':ask', message, message);
    }

});

var endgameHandlers = Alexa.CreateStateHandler(states.ENDMODE, {
    //this function asks a question about subjects

    'SubjectIntent': function() {
        console.log('Setting state to STARTMODE');
        this.handler.state = states.STARTMODE;
        this.emitWithState('SubjectIntent');
    },

    'Unhandled': function() {
        var message = 'Sorry I did not understand. Please say new to start a new quiz or exit to leave.';
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
            console.log('correct index: ' + i);
            retValue = i;
        }
    });
    return retValue;
}

 exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, subjectHandlers, questionHandlers, answerHandlers, endgameHandlers);
    alexa.execute();
};