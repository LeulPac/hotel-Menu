@echo off
rem START or STOP Services
rem ----------------------------------
rem Check if argument is STOP or START

if not ""%1"" == ""START"" goto stop

if exist C:\xampp\app\hypersonic\scripts\ctl.bat (start /MIN /B C:\xampp\app\server\hsql-sample-database\scripts\ctl.bat START)
if exist C:\xampp\app\ingres\scripts\ctl.bat (start /MIN /B C:\xampp\app\ingres\scripts\ctl.bat START)
if exist C:\xampp\app\mysql\scripts\ctl.bat (start /MIN /B C:\xampp\app\mysql\scripts\ctl.bat START)
if exist C:\xampp\app\postgresql\scripts\ctl.bat (start /MIN /B C:\xampp\app\postgresql\scripts\ctl.bat START)
if exist C:\xampp\app\apache\scripts\ctl.bat (start /MIN /B C:\xampp\app\apache\scripts\ctl.bat START)
if exist C:\xampp\app\openoffice\scripts\ctl.bat (start /MIN /B C:\xampp\app\openoffice\scripts\ctl.bat START)
if exist C:\xampp\app\apache-tomcat\scripts\ctl.bat (start /MIN /B C:\xampp\app\apache-tomcat\scripts\ctl.bat START)
if exist C:\xampp\app\resin\scripts\ctl.bat (start /MIN /B C:\xampp\app\resin\scripts\ctl.bat START)
if exist C:\xampp\app\jetty\scripts\ctl.bat (start /MIN /B C:\xampp\app\jetty\scripts\ctl.bat START)
if exist C:\xampp\app\subversion\scripts\ctl.bat (start /MIN /B C:\xampp\app\subversion\scripts\ctl.bat START)
rem RUBY_APPLICATION_START
if exist C:\xampp\app\lucene\scripts\ctl.bat (start /MIN /B C:\xampp\app\lucene\scripts\ctl.bat START)
if exist C:\xampp\app\third_application\scripts\ctl.bat (start /MIN /B C:\xampp\app\third_application\scripts\ctl.bat START)
goto end

:stop
echo "Stopping services ..."
if exist C:\xampp\app\third_application\scripts\ctl.bat (start /MIN /B C:\xampp\app\third_application\scripts\ctl.bat STOP)
if exist C:\xampp\app\lucene\scripts\ctl.bat (start /MIN /B C:\xampp\app\lucene\scripts\ctl.bat STOP)
rem RUBY_APPLICATION_STOP
if exist C:\xampp\app\subversion\scripts\ctl.bat (start /MIN /B C:\xampp\app\subversion\scripts\ctl.bat STOP)
if exist C:\xampp\app\jetty\scripts\ctl.bat (start /MIN /B C:\xampp\app\jetty\scripts\ctl.bat STOP)
if exist C:\xampp\app\hypersonic\scripts\ctl.bat (start /MIN /B C:\xampp\app\server\hsql-sample-database\scripts\ctl.bat STOP)
if exist C:\xampp\app\resin\scripts\ctl.bat (start /MIN /B C:\xampp\app\resin\scripts\ctl.bat STOP)
if exist C:\xampp\app\apache-tomcat\scripts\ctl.bat (start /MIN /B /WAIT C:\xampp\app\apache-tomcat\scripts\ctl.bat STOP)
if exist C:\xampp\app\openoffice\scripts\ctl.bat (start /MIN /B C:\xampp\app\openoffice\scripts\ctl.bat STOP)
if exist C:\xampp\app\apache\scripts\ctl.bat (start /MIN /B C:\xampp\app\apache\scripts\ctl.bat STOP)
if exist C:\xampp\app\ingres\scripts\ctl.bat (start /MIN /B C:\xampp\app\ingres\scripts\ctl.bat STOP)
if exist C:\xampp\app\mysql\scripts\ctl.bat (start /MIN /B C:\xampp\app\mysql\scripts\ctl.bat STOP)
if exist C:\xampp\app\postgresql\scripts\ctl.bat (start /MIN /B C:\xampp\app\postgresql\scripts\ctl.bat STOP)

:end

