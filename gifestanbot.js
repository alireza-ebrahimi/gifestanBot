var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');
var exec = require('child_process').exec;
var cheerio = require('cheerio');
var request = require('request');
var moment = require('moment');
var uuid = require('node-uuid');

var link = null;
var token = fs.readFileSync('key') + '';
token = token.trim();
// Setup polling way
var bot = new TelegramBot(token, {polling: true});


var queue = [];

var history = [];
history['id95247306'] = {url: '', msg: '', id: '', file_id : ''};
history['id72454160'] = {url: '', msg: '', id: '', file_id : ''};
var channelName = '@gifestan';

function send(fileName, captionStr)
{
    var buffer = fs.readFileSync(fileName);
    var type = fileType(buffer);
    var chatId = channelName;
    bot.sendVideo(chatId, buffer, {caption: captionStr});
    console.log('photo added to send queue');
}

function parseMessage(msg, idStr)
{
    if(msg.text.indexOf('http://') == 0 || msg.text.indexOf('https://') == 0)
    {
        history[idStr].url = msg.text;
        history[idStr].fileID = '';
        bot.sendMessage(history[idStr].id, 'link set to :\n' + history[idStr].url)
    } 
    else if(msg.document != undefined && msg.document.mime_type == 'video/mp4')
    {
        history[idStr].fileID = msg.document.file_id;
        history[idStr].url = 'telegram file id : ' + msg.document.file_id;
        bot.sendMessage(history[idStr].id, 'file id set to :\n' + history[idStr].fileID)
    }
    else if(msg.video != undefined)
    {
        history[idStr].fileID = msg.video.file_id;
        history[idStr].url = 'telegram file id : ' + msg.video.file_id;
        bot.sendMessage(history[idStr].id, 'file id set to :\n' + history[idStr].fileID)
    }
    else
    {
        history[idStr].msg = msg.text;
        bot.sendMessage(history[idStr].id, 'caption set to :\n' + history[idStr].msg)
    }
}

function extractVideos(chatId, linkAddr)
{
    request(linkAddr, function(err, resp, body){
        $ = cheerio.load(body);
        links = $('source'); //jquery get all hyperlinks
        $(links).each(function(i, link)
        {
            
            if($(link).attr('src').indexOf('.mp4') != -1)
            {
                console.log($(link).attr('src'));
                var postLink = '';
                try {
                    postLink = ($(link).closest('article').attr('data-entry-url'));
                    console.log(postLink);
                } catch (err) {}
                
                if(postLink != '')
                {
                    bot.sendMessage(chatId, postLink + '\n' + $(link).attr('src'));
                }
                else
                {
                    bot.sendMessage(chatId, $(link).attr('src'))
                }
            }
        });
        
        links = $('a'); //jquery get all hyperlinks
        $(links).each(function(i, link)
        {
            if($(link).attr('href').indexOf('.mp4') != -1)
            {
                console.log($(link).attr('href'));
                bot.sendMessage(chatId, $(link).attr('href'))
            }
        });
        
    });
}

bot.on('message', function (msg) {
    console.log(msg); 
    if(msg.from.id == 95247306 || msg.from.id == 72454160)
    {
        var chatId = msg.chat.id;
        var fromId = msg.from.id;
        var idStr = 'id' + msg.from.id;
        history[idStr].id = chatId;
        if(msg.text == undefined)
        {
            msg.text = '';
        }
        var splitParts = msg.text.split(" ");
        if(splitParts[0] == '/status')
        {
            bot.sendMessage(chatId, history[idStr].url == '' ? 'null' : history[idStr].url);
            bot.sendMessage(chatId, history[idStr].msg == '' ? 'null' : history[idStr].msg);
        }
        else if(splitParts[0] == '/list')
        {
            bot.sendMessage(chatId, JSON.stringify(queue));
        }
        else if(splitParts[0] == '/extract')
        {
            console.log('trying to extract ' + splitParts[1]);
            extractVideos(chatId, splitParts[1]);
        }
        else if(splitParts[0] == '/givemesomegif')
        {
            extractVideos(chatId, 'http://www.9gag.com/');
            extractVideos(chatId, 'http://www.9gag.com/funny');
            extractVideos(chatId, 'http://www.9gag.com/gif');
            extractVideos(chatId, 'http://www.9gag.com/wtf');
            extractVideos(chatId, 'http://www.9gag.com/geeky');
            //extractVideos('http://www.9gag.com/timely');
        }
        else if(splitParts[0] == '/add')
        {
            if(history[idStr].url != '' && history[idStr].msg != '')
            {
                
                queue.push(JSON.parse(JSON.stringify(history[idStr])));
                bot.sendMessage(chatId, 'added to queue');
                history[idStr].url = '';
                history[idStr].msg = '';
                history[idStr].file_id = '';
            }
            else
            {
                bot.sendMessage(chatId, 'url or msg is null');
            }
        }
        else if(splitParts[0] == '/sendnow')
        {
            sendVideo();
        }
        else if(splitParts[0] == '/reset')
        {
            history[idStr].url = '';
            history[idStr].msg = '';
            history[idStr].file_id = '';
        }
        else if(splitParts[0] == '/del')
        {
            data = queue.pop();
            bot.sendMessage(chatId, 'deleted : \n' + JSON.stringify(data));
        }
        else
        {
            parseMessage(msg, idStr);
        }
    }
});

function convertAndSend(node)
{
    var cmdLine = 'bash convert.sh "' + node.url + '" 1>res.txt 2>&1';
    console.log(cmdLine);
    var child = exec(cmdLine);
    child.on('exit', function (code, signal) {
        bot.sendDocument(node.id, 'res.txt', {caption: node.url});
        bot.sendVideo(channelName, 'final.gif.mp4', {caption: node.msg});
    });
}

function sendVideo()
{
    console.log('trying to send');
    node = queue.pop();
    bot.sendMessage(history['id95247306'].id, 'trying to send \n' + node);
    
    if(node != undefined)
    {
        console.log(node);
        if(node.fileID != '')
        {
            bot.getFileLink(node.fileID).then(function (resp) {
                console.log(resp);
                node.url = resp;
                convertAndSend(node);
            });
        }
        else
        {
            convertAndSend(node);
        }
    }
}

function sendSchedule()
{
    var h = moment().hour() + 8;
    bot.sendMessage(history['id95247306'].id, 'sending, h = ' + h);
    if((h > 10 && h < 14) || (h > 19 && h < 23))
    {
        sendVideo();
    }
    else
    {
        console.log('bad time, people are sleep');    
    }
    
}

setInterval(sendSchedule, 60 * 60 * 1000);
//send(process.argv[2], process.argv[3]);

