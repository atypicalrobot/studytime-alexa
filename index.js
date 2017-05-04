var Alexa = require('alexa-sdk');

var states = {
    QUESTIONMODE: '_QUESTIONMODE', // User is trying to answer a question
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};


var newSessionHandlers = {

     // This will short-cut any incoming intent or launch requests and route them to this handler.
    'NewSession': function() {
        this.handler.state = states.STARTMODE;
        this.emit(':ask', 'Say new to play');
    }

};

var subjectHandlers = Alexa.CreateStateHandler(states.STARTMODE, {

    'SubjectIntent': function () {
        var intentObj = this.event.request.intent;
        this.handler.state = states.QUESTIONMODE;
        console.log(this.handler.state);
        this.emit(':ask', 'What subject would you like to answer questions on?', 'You can say Maths or Physics');
    }

});

var questionHandlers = Alexa.CreateStateHandler(states.QUESTIONMODE, {

    'QuestionIntent': function () {
        // var intentObj = this.event.request.intent;
        // var subject = intentObj.slots.Subject.value;
        // console.log(subject)
        console.log('WE ASKED A QUESTION!!!!!!!!')
        this.emit(':ask', 'Where is Sweden? A, very smelly. B, really smelly. C, not smelly. D, Eww', 'A, B, C or D');
    },

    'AnswerIntent': function () {
        var intentObj = this.event.request.intent;
        var answer = intentObj.slots.Answer.value;
        console.log(answer)
        this.emit(':tell', answer)
    }

 });

 exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, subjectHandlers, questionHandlers);
    alexa.execute();
};