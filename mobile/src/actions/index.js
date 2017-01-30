import cozy, { LocalStorage as Storage } from 'cozy-client-js'
import localforage from 'localforage'

export const SETUP = 'SETUP'
export const SET_URL = 'SET_URL'
export const SET_STATE = 'SET_STATE'
export const ERROR = 'ERROR'

export class OnBoardingError extends Error {
  constructor (message) {
    super(message)
    this.name = 'OnBoardingError'
  }
}

export function setUrl (url) {
  return async dispatch => {
    if (/(.*):\/\/(.*)/.test(url) && !url.startsWith('https://')) {
      dispatch({ type: ERROR, error: 'mobile.onboarding.serverselection.wrong_address' })
      throw new OnBoardingError('The only supported protocol is https')
    }
    if (!url.startsWith('https://')) {
      url = `https://${url}`
    }
    return dispatch({ type: SET_URL, url: url })
  }
}

export const registerDevice = (router, location) => {
  return async (dispatch, getState) => {
    await dispatch(setUrl(getState().mobile.serverUrl))

    let oauth
    if (window.cordova && window.cordova.InAppBrowser) {
      oauth = {
        storage: new Storage(),
        clientParams: {
          redirectURI: 'http://localhost',
          softwareID: 'io.cozy.mobile.files',
          clientName: 'Mobile Cozy Files',
          scopes: ['io.cozy.files:GET']
        },
        onRegistered: (client, url) => {
          if (window.cordova && window.cordova.InAppBrowser) {
            const { InAppBrowser } = window.cordova
            const target = '_blank'
            const options = 'location=yes,hidden=no'
            const inAppBrowser = InAppBrowser.open(url, target, options)

            return new Promise((resolve) => {
              inAppBrowser.addEventListener('loadstop', ({url}) => {
                const accessCode = /\?access_code=(.+)$/.test(url)
                const state = /\?state=(.+)$/.test(url)

                if (accessCode || state) {
                  resolve(url)
                }
              })
            })
            .then(
              (url) => {
                inAppBrowser.close()
                return url
              },
              (err) => {
                inAppBrowser.close()
                dispatch(error(err))
                throw err
              }
            )
          }
        }
      }
    }

    cozy.init({
      cozyURL: `${getState().mobile.serverUrl}`,
      offline: {doctypes: ['io.cozy.files'], timer: 15},
      oauth: oauth
    })

    try {
      await cozy.authorize()
    } catch (err) {
      dispatch(error(err))
      throw err
    }

    dispatch({ type: SETUP })
    localforage.setItem('state', getState().mobile)
    if (location.state && location.state.nextPathname) {
      router.replace(location.state.nextPathname)
    } else {
      router.replace('/')
    }
  }
}

function error (err) {
  return { type: ERROR, error: err.message.toLowerCase().split(' ').join('_') }
}
