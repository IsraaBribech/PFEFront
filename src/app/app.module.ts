import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AdminComponent } from './admin/admin.component';
import { ReactiveFormsModule } from '@angular/forms'; // IMPORTER ReactiveFormsModule
import { FormsModule } from '@angular/forms'; // Importation importante pour ngModel

import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NiveauxComponent } from './niveaux/niveaux.component';
import { SpecialitesComponent } from './specialites/specialites.component';
import { DepartementsComponent } from './departements/departements.component';
import { CoursComponent } from './cours/cours.component';
import { RouterModule } from '@angular/router';
import { AppRoutingModule  } from './app-routing.module';
import { EnseignantsComponent } from './enseignants/enseignants.component';
import { EtudiantsComponent } from './etudiants/etudiants.component';
import { MatDialogModule } from '@angular/material/dialog';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { DeuxiemeInterfaceComponent } from './deuxieme-interface/deuxieme-interface.component';
import { CourComponent } from './deuxieme-interface/cour/cour.component';
import { ChapitreComponent } from './deuxieme-interface/chapitre/chapitre.component';
import { DevoirComponent } from './deuxieme-interface/devoir/devoir.component';
import { EnsprofilComponent } from './deuxieme-interface/ensprofil/ensprofil.component';
import { MessageComponent } from './deuxieme-interface/message/message.component';
import { QuizComponent } from './deuxieme-interface/quiz/quiz.component';
import { VoeuxComponent } from './deuxieme-interface/voeux/voeux.component';
import { LoginComponent } from './login/login.component';
import { ChefDepartementComponent } from './chef-departement/chef-departement.component';
import { AssignationComponent } from './assignation/assignation.component';
import { GroupesComponent } from './groupes/groupes.component';
import { CoursService } from './cours.service';
import { SpecialitesService } from './specialites.service';
import { NiveauxService } from './niveaux.service';
import { DepartementsService } from './departements.service';
import { VoeuxService } from './voeux.service';
import { ChapitreService } from './chapitre.service';
import { TroixiemeInterfaceComponent } from './troixieme-interface/troixieme-interface.component';
import { CourSuivieComponent } from './troixieme-interface/cour-suivie/cour-suivie.component';
import { DevoirRealiserComponent } from './troixieme-interface/devoir-realiser/devoir-realiser.component';
import { EdunotificationComponent } from './troixieme-interface/edunotification/edunotification.component';
import { EduprofilComponent } from './troixieme-interface/eduprofil/eduprofil.component';
import { MessageEnvoyerComponent } from './troixieme-interface/message-envoyer/message-envoyer.component';
import { QuizRepondComponent } from './troixieme-interface/quiz-repond/quiz-repond.component';
import { EnseignantService } from './enseignant.service';
import { DevoirService } from './devoir.service';
import { AccueilComponent } from './accueil/accueil.component';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { NotificationService } from './notification.service';

@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    DashboardComponent,
    NiveauxComponent,
    SpecialitesComponent,
    DepartementsComponent,
    CoursComponent,
    EnseignantsComponent,
    EtudiantsComponent,
    ChatbotComponent,
    DeuxiemeInterfaceComponent,
    CourComponent,
    ChapitreComponent,
    DevoirComponent,
    EnsprofilComponent,
    MessageComponent,
    QuizComponent,
    VoeuxComponent,
    LoginComponent,
    ChefDepartementComponent,
    AssignationComponent,
    GroupesComponent,
    TroixiemeInterfaceComponent,
    CourSuivieComponent,
    DevoirRealiserComponent,
    EdunotificationComponent,
    EduprofilComponent,
    MessageEnvoyerComponent,
    QuizRepondComponent,
    AccueilComponent,
    
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule,
    
    AppRoutingModule , 
    RouterModule ,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatDialogModule

     // AJOUTER ICI
  ],
  providers: [
    ChapitreService ,
    VoeuxService,
    DepartementsService,
    SpecialitesService,
    NiveauxService,
    DevoirService,
    EnseignantService,
    CoursService ,
    AuthService,
    MessageService,
    NotificationService
    
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
