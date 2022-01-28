/*Write a lex file to count the number of numbers appearing in the input. Count the number of integers (without a decimal) separately from the number of floating point numbers (with a decimal, and at least one digit on either side of the decimal).*/

%{
int nint=0,nfloat=0;
long scan_position = 0;
#define YY_USER_ACTION scan_position += yyleng;
%}

%%
\n ;

[ \n\t][-\+]?[0-9]+"."[0-9]+[ \t\n] {
    nfloat++;
    YY_FLUSH_BUFFER;
    fseek(yyin, scan_position-1, SEEK_SET);
    scan_position--;
}

[ \n\t][-\+]?[0-9]+[ \t\n] {
    nint++;
    YY_FLUSH_BUFFER;
    fseek(yyin, scan_position-1, SEEK_SET);
    scan_position--;
}

. ;
%%

int yywrap(void)  
{
    return 1;
}

int main(int argc, char*argv[]) 
{
    yyin=fopen(argv[1],"rb+");
    yylex();
    printf("Integers = %d\nFloats = %d\nAll numbers = %d\n",nint,nfloat,nint+nfloat);

    return 0;
} 