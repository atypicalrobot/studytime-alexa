var Alexa = require('alexa-sdk');
var https = require('https');

var states = {  //
    ANSWERMODE: '_ANSWERMODE', // User is trying to answer a question
    QUESTIONMODE: '_QUESTIONMODE', // Alexa asks the user the question
    STARTMODE: '_STARTMODE',  // Prompt the user to start or restart the game.
    ENDMODE: '_ENDMODE'  // Prompt the user to restart / exit at the end of the game
};

var subjectMap = {
    'english': 3,
    'maths': 2,
    'science': 1
}
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
var wrong_speechcons = [
    'as if!',
    'aw!',
    'aw man!',
    'blah!',
    'blarg!',
    'blast!',
    'bother!',
    'cheer up!',
    'oh dear!',
    'oh my!',
    'oh snap!',
    'oof!',
    'ouch!',
    'there there!',
    'uh oh!',
    'whoops!'

];
var correct_cheering = ['great answer!', 'that is correct!', 'you are right!','you are good at this!', 'look at you go!', 'correct!', 'affirmative!', 'you will be a master in no time!', 'keep it up!', 'you are smashing it!'];

var wrong_cheering = ['sorry, that is not correct!', 'close but nope!', 'that is nearly the right answer!', 'better luck next time!', 'hard luck, that is not it!'];

var end_speechcons = [
    'well well!',
    'voila!',
    'spoiler alert!',
    'splash!',
    'righto!',
    'dun dun dun!',
    'cheer up!',
    'all righty!',
    'abracadabra!'
]

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
        var intentObj = this.event.request.intent;
        var cardTitle = "Question";
        var cardContent = "Data provided by Open TB\n\n";
        var qid = this.attributes.qid;
        console.log('QuestionIntent triggered.');
        var output;
        if (qid === 0) {
            this.attributes.correct = 0;
            this.attributes.incorrect = 0;
            var subject = intentObj.slots.Subject.value;
            console.log(subject);
            console.log('Fetching questions as this is the first run.');
            httpGet('/api/multiplechoicequiz/?subject=' + subjectMap[subject.toString().toLowerCase()], this.event.session.user.accessToken, function (response) {
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
                    this.attributes.questions = responseData[Math.floor(Math.random() * responseData.length)].questions;
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
                var randEndSpeechconTmp = end_speechcons[Math.floor(Math.random() * end_speechcons.length)];
                var randEndSpeechcon = '<say-as interpret-as="interjection">' + randEndSpeechconTmp + '!</say-as>, ';
                var scoreOutput = 'You got ' + this.attributes.correct + ' correct and ' + this.attributes.incorrect + ' incorrect.';
                output = this.attributes.answerOutput + randEndSpeechcon + ' you have reached the end of the quiz, ' + scoreOutput + ' Say new to play again or exit to leave.';
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
        var randWrongSpeechconTmp = wrong_speechcons[Math.floor(Math.random() * wrong_speechcons.length)];
        var randWrongSpeechcon = '<say-as interpret-as="interjection">' + randWrongSpeechconTmp + '!</say-as>, ';
        console.log('correct answer: ' + question.answer.answers[0]);
        console.log('choices: ' + question.answer.choices);

        var correctAnswer = answerFromLetter(question.answer.answers[0], question.answer.choices);
        console.log(correctAnswer);
        var correctLetter = question.answer.answers[0];
        console.log(correctLetter);
        var result = randWrong;
        var endpoint = null;
        if(correctLetter.toString().toLowerCase() == answer.toString().toLowerCase()){
            result = randCorrectSpeechcon + randCorrect;
            this.attributes.correct = this.attributes.correct + 1;
            endpoint = '/correct/';
        } else {
            result = randWrongSpeechcon + randWrong;
            this.attributes.incorrect = this.attributes.incorrect + 1;
            endpoint = /incorrect/;
        }
        httpGet('/api/multiplechoicequestion/' + question.id + endpoint, this.event.session.user.accessToken, function (response) {
            // Parse the response into a JSON object ready to be formatted.
            console.log('RESPONSE: ' + response);
        }.bind(this));
        console.log('Setting state to QUESTIONMODE');
        this.handler.state = states.QUESTIONMODE;
        console.log('Incrementing qid');
        this.attributes.qid += 1;
        // this.emit(':tell', result + ' ' + question.answer.answers);
        this.attributes.answerOutput = result + ' the answer is ' + correctLetter + ', ' + correctAnswer + '. <break time="0.2s"/>';
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


function httpGet(query, accessToken, callback) {
  console.log("QUERY: " + 'studytime.xyz' + query);

    var options = {
      //http://api.nytimes.com/svc/search/v2/articlesearch.json?q=seattle&sort=newest&api-key=
        host: 'studytime.xyz',
        path: query,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    };

    var req = https.request(options, (res) => {
        var body = '';
        res.on('data', (d) => {
            body += d;
        });
        res.on('end', function () {
            console.log(body);
            callback(body);
        });
    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });
}

function answerFromLetter(rawLetter, choices) {
    var letter = rawLetter.toString().toLowerCase();
    if (letter == 'a') {
        return choices[0]
    }
    else if (letter == 'b') {
        return choices[1]
    }
    else if (letter == 'c') {
        return choices[2]
    }
    else if (letter == 'd') {
        return choices[3]
    }
    else {
        return null;
    }
}

 exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, subjectHandlers, questionHandlers, answerHandlers, endgameHandlers);
    alexa.execute();
};