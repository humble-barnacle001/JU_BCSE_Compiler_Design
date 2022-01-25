/* Write a lex file to count the number of lines, words, and characters in the input. */

%{
int nlines,nwords,nchars;
%}

%%
\n {
    nchars++;
    nlines++;
}

[^ \n\t]+ {
    nwords++;
    nchars=nchars+yyleng;
}

. {
    nchars++;
}
%%

int yywrap(void)  
{
    return 1;
}

int main(int argc, char*argv[]) 
{
    yyin=fopen(argv[1],"r");
    yylex();
    nlines+=1;
    printf("Lines = %d\nWords = %d\nCharacters = %d\n",nlines,nwords,nchars);

    return 0;
} 