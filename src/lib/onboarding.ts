const KEY = 'us.intro.seen'

const read = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const write = (seen: boolean) => {
  try {
    if (seen) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Storage may be unavailable (private mode). The intro simply shows again.
  }
}

export const hasSeenIntro = read
export const markIntroSeen = () => write(true)
export const resetIntro = () => write(false)
