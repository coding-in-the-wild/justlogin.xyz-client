function beginWatchingForAuthentication(emitter, fullApi) {
	var interval = setInterval(function() {
		fullApi.isAuthenticated(function (err, name) {
			if (!err && name) {
				emitter.emit('authenticated', name)
				clearInterval(interval)
			}
		})
	}, 2000)
	if (interval.unref) interval.unref()
}

function overwriteBeginAuthentication(emitter, fullApi) {
	var exposedApi = Object.create(fullApi)
	exposedApi.beginAuthentication = function beginAuthentication(emailAddress, cb) {
		beginWatchingForAuthentication(emitter, fullApi)
		fullApi.beginAuthentication(emailAddress, cb)
	}
	return exposedApi
}

function end(emitter, fullApi, sessionId, continued, cb) {
	process.nextTick(function() {
		emitter.emit('session', {
			sessionId: sessionId,
			continued: continued
		})
	})
	var exposedApi = overwriteBeginAuthentication(emitter, fullApi)
	cb(null, exposedApi, sessionId)
}

function acquireSession(api, emitter, cb) { //cb(err, api, session)
	var existingSessionId = localStorage.getItem('justLoginSessionId')

	api.getFullApi(existingSessionId, function (err, fullApi) {
		if (err) {
			api.createSession(function (err, newSessionId) {
				if (err) {
					cb(err)
				} else {
					localStorage.setItem('justLoginSessionId', newSessionId)
					api.getFullApi(newSessionId, function (err, fullApi) {
						if (err) {
							cb(err)
						} else {
							end(emitter, fullApi, newSessionId, false, cb)
						}
					})
				}
			})
		} else {
			end(emitter, fullApi, existingSessionId, true, cb)
		}
	})
}

module.exports = acquireSession
