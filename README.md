# quizaccess_cheatdetect

Tickets concernés :
* https://tasks.internal.cblue.be/issues/849390
* https://tasks.internal.cblue.be/issues/815956

Commande d'ajout du sous-module au Moodle, depuis sa racine : `git submodule add -b BRANCHE git@gitlab.cblue.be:cblue-moodle-projects/quizaccess_cheatdetect.git mod/quiz/accessrule/cheatdetect`

Procéder à l'upgrade classique `php admin/cli/upgrade.php` puis suivre les instructions