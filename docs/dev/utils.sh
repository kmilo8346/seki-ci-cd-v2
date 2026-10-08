#/bin/sh

# Added path to current terminal profile
PATH="/usr/local/bin:$PATH"
test -f ~/.nvm/nvm.sh && source ~/.nvm/nvm.sh


# Open current tab
newtabi(){  
  osascript \
-e 'tell application "iTerm" to activate' \
-e 'tell application "System Events" to tell process "iTerm" to keystroke "t" using command down' \
-e "tell application \"System Events\" to tell process \"iTerm\" to keystroke \"${@}\"" \
-e 'tell application "System Events" to tell process "iTerm" to key code 52'
sleep 1
}