import { NgModule } from "@angular/core"
import { RouterModule, Routes } from '@angular/router';
import { NiveauxComponent } from "./niveaux/niveaux.component"
import { SpecialitesComponent } from "./specialites/specialites.component"
import { DepartementsComponent } from "./departements/departements.component"
import { CoursComponent } from "./cours/cours.component"
import { AccueilComponent } from "./accueil/accueil.component"
import { LoginComponent } from "./login/login.component"


import { AdminComponent } from "./admin/admin.component"
import { EnseignantsComponent } from "./enseignants/enseignants.component"
import { EtudiantsComponent } from "./etudiants/etudiants.component"
import { DeuxiemeInterfaceComponent } from "./deuxieme-interface/deuxieme-interface.component"
import { TroixiemeInterfaceComponent } from "./troixieme-interface/troixieme-interface.component"
import { CourComponent } from "./deuxieme-interface/cour/cour.component"
import { DevoirComponent } from "./deuxieme-interface/devoir/devoir.component"
import { QuizComponent } from "./deuxieme-interface/quiz/quiz.component"
import { MessageComponent } from "./deuxieme-interface/message/message.component"
import { VoeuxComponent } from "./deuxieme-interface/voeux/voeux.component"
import { EnsprofilComponent } from "./deuxieme-interface/ensprofil/ensprofil.component"


// Composants de l'interface étudiant
import { CourSuivieComponent } from "./troixieme-interface/cour-suivie/cour-suivie.component"
import { DevoirRealiserComponent } from "./troixieme-interface/devoir-realiser/devoir-realiser.component"
import { QuizRepondComponent } from "./troixieme-interface/quiz-repond/quiz-repond.component"
import { MessageEnvoyerComponent } from "./troixieme-interface/message-envoyer/message-envoyer.component"
import { EduprofilComponent } from "./troixieme-interface/eduprofil/eduprofil.component"
import { EdunotificationComponent } from "./troixieme-interface/edunotification/edunotification.component"
import { ChefDepartementComponent } from "./chef-departement/chef-departement.component"
import { AssignationComponent } from "./assignation/assignation.component"
import { GroupesComponent } from "./groupes/groupes.component"

const routes: Routes = [
  { path: "", redirectTo: "/admin", pathMatch: "full" },
  { path: "accueil", component: AccueilComponent },

  { path: "admin", component: AdminComponent },
  { path: "login", component: LoginComponent },

  { path: "enseignants", component: EnseignantsComponent },
  { path: "etudiants", component: EtudiantsComponent },
  { path: "deuxieme-interface", component: DeuxiemeInterfaceComponent },
  { path: "troixieme-interface", component: TroixiemeInterfaceComponent }, // Interface étudiant
  { path: "dashboard", component: DeuxiemeInterfaceComponent }, // Utiliser DeuxiemeInterfaceComponent comme dashboard
  { path: "niveaux", component: NiveauxComponent },
  { path: "specialites", component: SpecialitesComponent },
  { path: "departements", component: DepartementsComponent },
  { path: "cours", component: CoursComponent },
  { path: "assignation", component: AssignationComponent },
  { path: "groupes", component: GroupesComponent },


  { path: "chef-departement", component: ChefDepartementComponent }, // Route existante pour CoursComponent
  // Route existante pour CoursComponent
  { path: "cour", component: CourComponent },
  { path: "devoir", component: DevoirComponent },
  { path: "quiz", component: QuizComponent },
  { path: "message", component: MessageComponent },
  { path: "voeux", component: VoeuxComponent },

  { path: "ensprofil", component: EnsprofilComponent }, // Nouvelle route pour le profil enseignant

  // Routes pour l'interface étudiant
  { path: "troixieme-interface/cour-suivie", component: CourSuivieComponent },
  { path: "troixieme-interface/devoir-realiser", component: DevoirRealiserComponent },
  { path: "troixieme-interface/quiz-repond", component: QuizRepondComponent },
  { path: "troixieme-interface/message-envoyer", component: MessageEnvoyerComponent },
  { path: "troixieme-interface/eduprofil", component: EduprofilComponent },
  { path: "troixieme-interface/notification", component: EdunotificationComponent }, // Ajout de la route pour les notifications
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }