#! /bin/bash

rm in.mp4 watermark.png out.mp4 final.gif.mp4
wget -O in.mp4 $1 
ffmpeg -an -i in.mp4 -vf scale="320:trunc(ow/a/2)*2" out.mp4
convert logo.png -resize 80 watermark.png
ffmpeg -i out.mp4 -i watermark.png -filter_complex "overlay=5:5" final.gif.mp4
ls -lh
