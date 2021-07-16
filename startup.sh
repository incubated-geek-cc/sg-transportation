#!/bin/bash

function pause(){
   read -p "$*"
}

npm run dev

pause 'Press [Enter] key to continue...'

