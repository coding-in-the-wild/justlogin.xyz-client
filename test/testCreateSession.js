var test = require('tap').test
var EventEmitter = require('events').EventEmitter
var establishSession = require('../createSession.js')

if (process) { //if running in node
	var LocalStorage = require('node-localstorage').LocalStorage
	localStorage = new LocalStorage('./fakeLocalStorage') //var is not supposed to be here :(
}

var localStorageKey = "justLoginSessionId" //key
var fakeExistingSessionId = "fake-existing-session-identification" //value
var fakeNewSessionId = "newSessionId"
var fakeEmailAddress = "ex@mp.le"
var fakeArgApi = {
	isAuthenticated: function (cb) {
		cb(null, fakeEmailAddress)
	}
}
var fakeApi = {
	continueSession: function (get, cb) {
		if (get === fakeExistingSessionId) {
			cb(null, fakeArgApi, fakeExistingSessionId)
		} else {
			cb(new Error("u haz error"))
		}
	},
	createSession: function (cb) {
		cb(null, fakeArgApi, fakeNewSessionId)
	}
}


test('create a new session with establishSession', function (t) {
	t.plan(8)
	var emitter = new EventEmitter()
	
	establishSession(fakeApi, emitter, function (err, api, session) {
		t.notOk(err, "no error")
		t.notEqual(session, fakeExistingSessionId, "sessionId must not be old") //creates session id
		t.equal(session, fakeNewSessionId, "sessionId must be new")
		t.equal(typeof api.isAuthenticated, "function", "api has 'isAuthenticated' function")
		t.equal(typeof api.beginAuthentication, "function", "api has beginAuthentication() function [added by overwriteBeginAuthentication()]")
		setTimeout(t.end.bind(t), 2010) //must wait for authenticated event to be called
	})

	emitter.on('session', function (data) {
		t.notOk(data.continued, "created a NEW session")
		t.ok(data.sessionId, "has sessionId property")
		t.equal(data.sessionId, fakeNewSessionId, "created a session id")
	})

	emitter.on('authenticated', function (whom) {
		t.ok(whom, "got authenticated")
		t.equal(whom, fakeEmailAddress, "correct email (new)")
	})
})

test('continue an existing session with establishSession', function (t) {
	t.plan(7)

	localStorage.setItem(localStorageKey, fakeExistingSessionId) //set the session id
	t.equal(localStorage.getItem(localStorageKey), fakeExistingSessionId, "localStorage works")

	var emitter = new EventEmitter()

	localStorage.setItem("keepDatabaseFromBecomingEmpty", fakeExistingSessionId)

	establishSession(fakeApi, emitter, function (err, api, session) {
		t.notOk(err, "no error")
		t.equal(fakeExistingSessionId, session, "sessionId must be old") //must retrieve session id
		t.notEqual(fakeNewSessionId, session, "sessionId must not be new")
		t.notEqual(fakeArgApi, api, "these must be the different because of overwriteBeginAuthentication()") //changed from .equal to .deepEqual 20140802

		localStorage.removeItem(localStorageKey) //delete the session id
		setTimeout(t.end.bind(t), 2010) //must wait for authenticated event to be called
	})

	emitter.on('session', function (data) {
		t.ok(data.continued, "continued an existing session")
		t.equal(data.sessionId, fakeExistingSessionId, "got correct id")
	})
	emitter.on('authenticated', function (whom) {
		t.fail("not supposed to get this event here...")
	})
})