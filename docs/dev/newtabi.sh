#/bin/sh

# Added path to current terminal profile
PATH="/usr/local/bin:$PATH"
test -f ~/.nvm/nvm.sh && source ~/.nvm/nvm.sh

params=(-e 'tell application "iTerm" to activate' -e 'tell application "System Events" to tell process "iTerm" to keystroke "t" using command down')

for part in $@
do
    params=("${params[@]}"  -e "tell application \"System Events\" to tell process \"iTerm\" to keystroke \"$part\"")
    params=("${params[@]}"  -e 'tell application "System Events" to tell process "iTerm" to key code 49')
done

params=("${params[@]}"  -e 'tell application "System Events" to tell process "iTerm" to key code 52')


# Open current tab
osascript "${params[@]}"

sleep 1
