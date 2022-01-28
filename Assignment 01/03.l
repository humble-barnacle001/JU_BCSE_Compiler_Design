/* Write a lex file to count the number of words in an input text that start with a vowel.*/
/* Write a lex file to count the number of lines, words, and characters in the input. */

%{
int nwords;
%}

%%
\n ;

[ \n\t][aeiouAEIOU][^ \t\n]* {
    nwords++;
}

. ;
%%

int yywrap(void)  
{
    return 1;
}

int main(int argc, char*argv[]) 
{
    yyin=fopen(argv[1],"r");
    yylex();
    printf("Words starting with vowel = %d\n",nwords);

    return 0;
} 