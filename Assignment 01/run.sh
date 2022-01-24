#!/bin/bash
if [[ -z "$1" || ! -f $1.l ]]
then
    echo "File does not exist"
    exit
fi

count=`ls -1 *.yy.c 2>/dev/null | wc -l`
if [ $count != 0 ]
then
rm *.yy.c
fi

count=`ls -1 *.out 2>/dev/null | wc -l`
if [ $count != 0 ]
then
rm *.out
fi

lex $1.l
cc lex.yy.c
./a.out input.txt