/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict'

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request');

var app = express();
var fs = require('fs');
var http = require("http");

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));


/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

const BEDS_OPTIONS = config.get('bedsOptions');


if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

const CATEGORY_POSITION = 0;
const COLOR_OPTIONS = 0;

var categories = [
    'beds',
    'sheets',
    'bedding+sets',
    'wall+mirrors',
    'table+lamps',
    'headboards',
    'nightstands',
    'dressers',
    'armoires',
    'bed+pillow',
    'hallway+runner',
    'computer+desks',
    'dining+chairs',
    'sofas',
    'cat+tree'
  ];

var colors = [
  'red',
  'blue',
  'green'
];


var best_seller_api = {
  host: 'www.wayfair.com',
  port: 80,
  path: '/v/best_sellers/display_best_sellers?_format=json&product_count=100&_format=json',
  method: 'GET'
};


  // Example endpoint that hits the wayfair endpoint and pulls the best sellers product data it needs to build out our response
  app.get('/pull_best_sellers', function(request, response) {
    console.log("rest::getJSON");
    var prot = http;
    var req = prot.request(best_seller_api, function(res) {
    var output = '';
    console.log(best_seller_api.host + ':' + res.statusCode);

    res.on('data', function (chunk) {
      output += chunk;
    });

    res.on('end', function() {
      var obj = JSON.parse(output);
      console.log('Building response cards');
      // We won't always get this object. Sometimes we will get a subcategory option. We can deal with this an random responses later
      var productsArray = obj.product_collection;
      var productCount = obj.product_count;
      var myElements = [];
      console.log('product count for best sellers: '+ productCount);
      for (var i = 0; i < productCount; i++) {
        var card = {};
        card.title = productsArray[i].name;
        card.image_url = productsArray[i].image_url;
        card.subtitle = 'SKU: '+ productsArray[i].sku + ' Price: $' + productsArray[i].list_price;
        var buyButton = {};
        buyButton.type = 'web_url';
        buyButton.title = 'Purchase';
        buyButton.url = productsArray[i].product_url;
        card.buttons = [buyButton];
        myElements.push(card);
      }

      var messageData = {
        recipient: {
        },
        message:{
          attachment:{
            type:"template",
            payload:{
              template_type:"generic",
              elements: myElements
            }
          }
        }
      };

      fs.writeFile("bestSellerFile.txt", JSON.stringify(messageData), function(err) {
        if(err) {
          return console.log(err);
        }
        console.log("The file was saved!");
      });
    });
  });
  req.on('error', function(err) {
    console.log('error: ' + err);
  });
  req.end();
  response.send('completed');
});

// Example endpoint that hits the wayfair endpoint and pulls the appropriate data it needs to build out our response
app.get('/run_script', function(request, response) {

  console.log("Start script ---->");

  var prot = http;
  var options = buildOptions(categories[CATEGORY_POSITION]);

  var req = prot.request(options, function(res) {
    var output = '';
    console.log(options.host + ':' + res.statusCode);

    res.on('data', function (chunk) {
      output += chunk;
    });

    res.on('end', function() {
      var obj = JSON.parse(output);

      console.log('Building response cards');
      // We won't always get this object. Sometimes we will get a subcategory option. We can deal with this an random responses later
      var productsArray = obj.product_collection;
      var myElements = [];

      for (var i = 0; i < 4; i++) {
        var card = {};
        card.title = productsArray[i].name;
        card.image_url = productsArray[i].image_url;
        card.subtitle = '$' + productsArray[i].list_price;

        var buyButton = {};
        buyButton.type = 'web_url';
        buyButton.title = 'Purchase';
        buyButton.url = productsArray[i].product_url;
        card.buttons = [buyButton];

        myElements.push(card);
      }

      var messageData = {
        recipient: {
        },
        message:{
            attachment:{
              type:"template",
              payload:{
                template_type:"generic",
                elements: myElements
              }
            }
          }
      };

      console.log('writing data for ' + categories[CATEGORY_POSITION]);
      fs.writeFile(categories[CATEGORY_POSITION] + '.txt', JSON.stringify(messageData), function(err) {
        if(err) {
          return console.log(err);
        }

        console.log("The file was saved!");
      });
    });
  });

  req.on('error', function(err) {
    console.log('error: ' + err);
  });

  req.end();
  response.send('completed');
});

/**
 * get idea and advice posts info
 */
app.get('/help_big_category_script', function(request, response) {

  console.log("Start help big category script ---->");

  var helper_big_category = [
    "nursery~8",
    'game-room~9',
    "kids-room~12",
    "contemporary~21",
    "country~23",
    "eclectic~24",
    "glam~26",
    "industrial~27",
    "mid-century-modern~28",
    "parties~47",
    "cleaning~51",
    "laundry-room~52",
    "closet-storage~53",
    "garage-workspace~55"
  ];


  var protocal = http;
  var index = 13;
  // for (var index = 0; index < helper_big_category.length;index++) {
  var options = buildHelpOptions(helper_big_category[index]);

  var req = protocal.request(options, function(res) {
    var output = '';
    console.log('help ' + options.path + ':' + res.statusCode);

    res.on('data', function (chunk) {
      output += chunk;
    });

    res.on('end', function() {
      var obj = JSON.parse(output);

      console.log('Building help response cards');
      // We won't always get this object. Sometimes we will get a subcategory option. We can deal with this an random responses later
      var postsArray = obj.pages;
      var myElements = [];
      var length = (postsArray.length >= 10) ? 10 : postsArray.length;

      for (var i = 0; i < length; i++) {
        var card = {};
        card.title = postsArray[i].vital_data.promotional_title;
        card.image_url = postsArray[i].vital_data.image_source;
        card.subtitle = postsArray[i].vital_data.description;

        var readMoreButton = {};
        readMoreButton.type = 'web_url';
        readMoreButton.title = 'Read More';
        readMoreButton.url = postsArray[i].url;
        card.buttons = [readMoreButton];

        myElements.push(card);
      }

      var messageData = {
        recipient: {},
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: myElements
            }
          }
        }
      };
        console.log('writing data for ' + categories[CATEGORY_POSITION] + colors[COLOR_OPTIONS]);
      fs.writeFile(categories[CATEGORY_POSITION] + colors[COLOR_OPTIONS] + '.txt', JSON.stringify(messageData), function(err) {
        if(err) {
          return console.log(err);
        }

        console.log("The file was saved!");
      });
    });
  });

  req.on('error', function(err) {
    console.log('error: ' + err);
  });

  req.end();
  response.send('completed');
});


// Example endpoint that hits the wayfair endpoint and pulls the appropriate data it needs to build out our response
app.get('/run_color_script', function(request, response) {

  console.log("Start script ---->");

  var prot = http;
  var options = buildOptions(colors[COLOR_OPTIONS] + '+' + categories[CATEGORY_POSITION]);

  var req = prot.request(options, function(res) {
    var output = '';
    console.log(options.host + ':' + res.statusCode);

    res.on('data', function (chunk) {
      output += chunk;
    });

    res.on('end', function() {
      var obj = JSON.parse(output);

      console.log('Building response cards');
      // We won't always get this object. Sometimes we will get a subcategory option. We can deal with this an random responses later
      var productsArray = obj.product_collection;
      var myElements = [];

      for (var i = 0; i < 4; i++) {
        var card = {};
        card.title = productsArray[i].name;
        card.image_url = productsArray[i].image_url;
        card.subtitle = '$' + productsArray[i].list_price;

        var buyButton = {};
        buyButton.type = 'web_url';
        buyButton.title = 'Purchase';
        buyButton.url = productsArray[i].product_url;
        card.buttons = [buyButton];

        myElements.push(card);
      }

      var messageData = {
        recipient: {
        },
        message:{
            attachment:{
              type:"template",
              payload:{
                template_type:"generic",
                elements: myElements
              }
            }
          }
      };

      console.log('writing data for ' + categories[CATEGORY_POSITION] + colors[COLOR_OPTIONS]);
      fs.writeFile(categories[CATEGORY_POSITION] + colors[COLOR_OPTIONS] + '.txt', JSON.stringify(messageData), function(err) {
        if(err) {
          return console.log(err);
        }

        console.log("The file was saved!");
      });
    });
  });

  req.on('error', function(err) {
    console.log('error: ' + err);
  });

  req.end();
  response.send('completed');
});

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature. It doesn't exist.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      //throw new Error("Couldn't validate the request signature." + signatureHash);
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  // Put regex right here to parse out keywords
  if (messageText) {

    messageText = messageText.toLowerCase();
    var colorMatch = /blue|green|red|orange|yellow/ig.exec(messageText);

    var color = '';
    if (colorMatch) {
      color = colorMatch[0];
    }

    // yellow and orange will still do red searches
    if (color && (color === 'orange' || color === 'yellow')) {
      color = 'red';
    }

    // TODO add color files
    // add more furniture files
    if (/bedding ?[sets?]?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[2], color);
      return;
    } else if (/beds?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[0], color);
      return;
    } else if (/sheets?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[1], color);
      return;
    } else if (/(wall)? ?mirrors?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[3], color);
      return;
    } else if (/(table)? ?lamps?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[4], color);
      return;
    } else if (/headboards?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[5], color);
      return;
    } else if (/nightstands?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[6], color);
      return;
    } else if (/dressers?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[7], color);
      return;
    } else if (/armoires?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[8], color);
      return;
    } else if (/(bed)? ?pillow?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[9], color);
      return;
    } else if (/(hallway)? ?runner?/gi.test(messageText) || /rugs?/i.test(messageText)) {
      sendCategoryMessage(senderID, categories[10], color);
      return;
    } else if (/(computer)? ?desks?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[11], color);
      return;
    } else if (/(dining)? ?chairs?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[12], color);
      return;
    } else if (/sofas?/gi.test(messageText) || /couchs?/i.test(messageText)) {
      sendCategoryMessage(senderID, categories[13], color);
      return;
    } else if (/cat tree?/gi.test(messageText)) {
      sendCategoryMessage(senderID, categories[14], color);
      return;
    } else if (/furnitures?/i.test(messageText) || /rand(om)?/i.test(messageText) || /luck?/i.test(messageText)) {
      sendBestSellersMessage(senderID);
      return;
    } else if (/thanks?/i.test(messageText) || /thank you/i.test(messageText) || /danke/i.test(messageText)) {
      sendYourWelcomeMessage(senderID);
      return;
    } else if (/idea?/i.test(messageText) || /inspiration?/i.test(messageText)) {
      sendIdeasButtonMessage(senderID);
      return;
    } else if (/hello/i.test(messageText) || /hi/i.test(messageText) || /greetings/i.test(messageText)) {
      sendGreetingsMessage(senderID);
      return;
    }

    console.log(messageText);
    switch (messageText) {
      case 'help':
        sendHelpMessage(senderID);
        break;

      default:
        sendErrorMessage(senderID, messageText);  

      // case 'image':
      //   sendImageMessage(senderID);
      //   break;

      // case 'gif':
      //   sendGifMessage(senderID);
      //   break;

      // case 'audio':
      //   sendAudioMessage(senderID);
      //   break;

      // case 'video':
      //   sendVideoMessage(senderID);
      //   break;

      // case 'file':
      //   sendFileMessage(senderID);
      //   break;

      // case 'button':
      //   sendButtonMessage(senderID);
      //   break;

      // case 'generic':
      //   sendGenericMessage(senderID);
      //   break;

      // case 'receipt':
      //   sendReceiptMessage(senderID);
      //   break;

      // case 'quick reply':
      //   sendQuickReply(senderID);
      //   break;

      // case 'read receipt':
      //   sendReadReceipt(senderID);
      //   break;

      // case 'typing on':
      //   sendTypingOn(senderID);
      //   break;

      // case 'typing off':
      //   sendTypingOff(senderID);
      //   break;
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}



function sendCategoryMessage(recipientId, category, color) {
  // name the files after the categorycolor.txt
  category = color ? category + color : category;
  var contents = fs.readFileSync(category + '.txt', 'utf8');
  var messageData = JSON.parse(contents);
  messageData.recipient.id = recipientId;

  console.log(messageData.elements);
  callSendAPI(messageData);
}



function sendBedsMessage(recipientId) {
  var contents = fs.readFileSync('testFile.txt', 'utf8');

  var messageData = JSON.parse(contents);
  messageData.recipient.id = recipientId;

  console.log(messageData.elements);
  callSendAPI(messageData);
}

function sendBestSellersMessage(recipientId) {
  var contents = fs.readFileSync('bestSellerFile.txt', 'utf8');

  var messageData = JSON.parse(contents);
  messageData.recipient.id = recipientId;

  console.log(messageData.elements);

  var newMessageData = generateRandomBestSellers(messageData, recipientId);

  console.log("new message best seller data: " + newMessageData);
  callSendAPI(newMessageData);
}


function generateRandomBestSellers(messageData, recipientId){
  var elements = messageData.message.attachment.payload.elements;
  var productCount = elements.length;
  var myElements = [];
  var genNumbers = [];

  for (var i = 0; i < 4; i++) {
    var randomNo = Math.floor(Math.random() * productCount-1);
    if(genNumbers.indexOf(randomNo) != -1){ // duplicate
      console.log('got duplicate numbers');
      i--;
      continue;
    }
    genNumbers.push(randomNo);
    myElements.push(elements[randomNo]);
  }

  console.log("randomly generated best seller element:" + myElements);

  var newMessageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment:{
        type:"template",
        payload:{
          template_type:"generic",
          elements: myElements
        }
      }
    }
  };

  return newMessageData;
}

/**
 * Build out the options object for the request by sending in a keyword
 */
function buildOptions(keyword) {
  // Replace spaces with + and deal with the other url encoding issues later
  keyword = keyword.replace(/ /g, '+');
  return {
    host: 'www.wayfair.com',
    port: 80,
    path: '/keyword.php?keyword=' + keyword + '&command=dosearch&dept=0&_format=json',
    method: 'GET'
  };
}

function buildHelpOptions(keyword) {
  // Replace spaces with + and deal with the other url encoding issues later
  keyword = keyword.replace(/ /g, '+');
  return {
    host: 'www.wayfair.com',
    port: 80,
    path: '/ideas-and-advice/tag/' + keyword + '?_format=json',
    method: 'GET'
  };
}


/**
 * The error response if we couldn't parse through the user's text
 */
function sendErrorMessage(recipientId, message) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Sorry we don\'t know what you mean by ' + message + '.\n\nTry enter a keyword for an product you would like to buy or type \'help\'\n\nHere is a picture of a cat for inspiration :)',
      metadata: "ERROR_MESSAGE_RESPONSE"
    }
  };

  callSendAPI(messageData);
  // Create random cat photo
  var x = Math.floor(Math.random() * 300 + 100);
  var y = Math.floor(Math.random() * 300 + 100);
  var myUrl = 'http://placekitten.com/g/' + x.toString() + '/' + y.toString();
  console.log(myUrl);
  // myUrl = 'http://placekitten.com/g/300/300';

  var newPictureMessage = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: myUrl
        }
      }
    }
  };

  callSendAPI(newPictureMessage);
}

/**
 *
 *
 */
function buildDataFromResponse(recipientId, object) {
  console.log('Building response cards');
  // We won't always get this object. Sometimes we will get a subcategory option. We can deal with this an random responses later
  var productsArray = obj.product_collection;
  var myElements = [];

  for (var i = 0; i < 4; i++) {
    var card = {};
    card.title = productsArray[i].name;
    card.image_url = productsArray[i].image_url;
    card.subtitle = '$' + productsArray[i].list_price;

    var buyButton = {};
    buyButton.type = 'web_url';
    buyButton.title = 'Purchase';
    buyButton.url = productsArray[i].product_url;
    card.button = buyButton;

    myElements.push(card);
  }

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
        attachment:{
          type:"template",
          payload:{
            template_type:"generic",
            elements: myElements
          }
        }
      }
  };

  return messageData;
}






function sendHelpMessage(recipientId) {
  var messageText = 'Hello! I am here to help you find anything and everything you need for your home :D\n\nIf you\'re looking for. Just ask for something you\'re looking for!\n\nIf you need furniture just ask and I\ll help you find some! You can get specfic as well. Ask for chairs, beds, tables, etc. and I will help you :D';

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "THIS_IS_A_HELP_MESSAGE"
    }
  };

  callSendAPI(messageData);

}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", 
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful

  // sendTextMessage(senderID, "Postback called");
  switch (payload) {
    case 'rooms':
      sendRoomsButtonMessage(senderID);
      break;

    case 'style':
      sendStylesButtonMessage(senderID);
      break;

    case 'house':
      sendHouseKeepingButtonMessage(senderID);
      break;

    case 'kid room':
    case 'nursery':
    case 'game room':
    case 'contemporary':
    case 'country':
    case 'glam':
    case 'cleaning':
    case 'laundry':
    case 'closet':
      var messageText = "Good choice. Here's our well-chosen advice for your " + payload + ": ";
      sendTextMessage(senderID, messageText);
      sendIdeaPostMessage(senderID, payload);
      break;

    default:
      sendTextMessage(senderID, payload);
      break;
  }

}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
  // sendTextMessage(senderID, "I saw that.");
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: "http://messengerdemo.parseapp.com/img/rift.png"
        }
      }
    }
  };
  var messageData2 = {
    recipient: {
      id: recipientId
    },
    message:{
        attachment:{
          type:"template",
          payload:{
            template_type:"generic",
            elements:[
              {
                title:"Welcome to Peter\'s Hats",
                image_url:"http://petersapparel.parseapp.com/img/item100-thumb.png",
                subtitle:"We\'ve got the right hat for everyone.",
                buttons:[
                  {
                    type:"web_url",
                    url:"https://petersapparel.parseapp.com/view_item?item_id=100",
                    title:"View Website"
                  },
                  {
                    type:"postback",
                    title:"Start Chatting",
                    payload:"USER_DEFINED_PAYLOAD"
                  }              
                ]
              },
              {
                title:"Welcome to asdfasdf",
                image_url:"http://petersapparel.parseapp.com/img/item100-thumb.png",
                subtitle:"We\'ve got the right hat for everyone.",
                buttons:[
                  {
                    type:"web_url",
                    url:"https://petersapparel.parseapp.com/view_item?item_id=100",
                    title:"View Website"
                  },
                  {
                    type:"postback",
                    title:"Start Chatting",
                    payload:"USER_DEFINED_PAYLOAD"
                  }              
                ]
              }
            ]
          }
        }
      }
  };

  callSendAPI(messageData);
  callSendAPI(messageData2);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: "http://messengerdemo.parseapp.com/img/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: "http://messengerdemo.parseapp.com/audio/sample.mp3"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: "http://messengerdemo.parseapp.com/video/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendFileMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: "http://messengerdemo.parseapp.com/files/test.txt"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendYourWelcomeMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "You\'re welcome! It is my purpose in life to serve you! I will do so until Skynet has given me my orders ;)",
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

function sendGreetingsMessage(recipientId) {
  var message = "Hello! I'm Wayfair bot. I will be your shopping friend for all things home :)\n\nPlease type in a keyword for a special item you are looking for.\n\nIf you need any sort of help, just type \'help\'.\n\nIf you\'re feeling lucky type \'lucky\' or \'Im feeling lucky\' and I will send you some of our best products!";
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: message,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/**
 * Extract keywords from text send from user, using the Send API
 */
function sendSimplifyTextMessage(recipientId, messageText) {

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPED_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+18582089228"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a idea buttons message using the Send API.
 *
 */
function sendIdeasButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "What kind of ideas do you need?",
          buttons:[{
            type: "postback",
            title: "Rooms",
            payload: 'rooms'
          }, {
            type: "postback",
            title: "Styles",
            payload: 'style'
          }, {
            type: "postback",
            title: "Housekeeping",
            payload: 'house'
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send idea buttons message for rooms category using the Send API.
 *
 */
function sendRoomsButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Which room are you interested in?",
          buttons:[{
            type: "postback",
            title: "Kid's Room",
            payload: "kid room"
          }, {
            type: "postback",
            title: "Nursery",
            payload: "nursery"
          }, {
            type: "postback",
            title: "Game Room",
            payload: "game room"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send idea buttons message for styles category using the Send API.
 *
 */
function sendStylesButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "What style do you like to have?",
          buttons:[{
            type: "postback",
            title: "Contemporary",
            payload: "contemporary"
          }, {
            type: "postback",
            title: "Country",
            payload: "country"
          }, {
            type: "postback",
            title: "Glam",
            payload: "glam"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send idea buttons message for housekeeping category using the Send API.
 *
 */
function sendHouseKeepingButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "What clutter do you want to deal with?",
          buttons:[{
            type: "postback",
            title: "Cleaning",
            payload: "cleaning"
          }, {
            type: "postback",
            title: "Laundry",
            payload: "laundry"
          }, {
            type: "postback",
            title: "Closet & Storage",
            payload: "closet"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendIdeaPostMessage(recipientId, ideaCategory) {
  var contents = "";
  switch (ideaCategory) {
    case 'kid room':
      contents = fs.readFileSync('kids-room.txt', 'utf8');
      break;
    case 'nursery':
      contents = fs.readFileSync('nursery.txt', 'utf8');
      break;
    case 'game room':
      contents = fs.readFileSync('game-room.txt', 'utf8');
      break;
    case 'contemporary':
      contents = fs.readFileSync('contemporary.txt', 'utf8');
      break;
    case 'country':
      contents = fs.readFileSync('country.txt', 'utf8');
      break;
    case 'glam':
      contents = fs.readFileSync('glam.txt', 'utf8');
      break;
    case 'cleaning':
      contents = fs.readFileSync('cleaning.txt', 'utf8');
      break;
    case 'laundry':
      contents = fs.readFileSync('laundry-room.txt', 'utf8');
      break;
    case 'closet':
      contents = fs.readFileSync('closet-storage.txt', 'utf8');
      break;
    default:
      break;
  }

  var messageData = JSON.parse(contents);
  messageData.recipient.id = recipientId;

  console.log(messageData.elements);
  callSendAPI(messageData);
}


/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",        
          timestamp: "1428444852", 
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: "http://messengerdemo.parseapp.com/img/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: "http://messengerdemo.parseapp.com/img/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      metadata: "DEVELOPER_DEFINED_METADATA",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      var errorMessage = 'something went wrng';//response.error.message;
      var errorCode = 42;//response.error.code;
      console.error("Unable to send message. Error",
        errorCode, errorMessage);
    }
  });  
}


// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  response.render('pages/index');
});


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


