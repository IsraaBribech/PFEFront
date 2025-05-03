import {
  Component,
  type OnInit,
  HostListener,
   ChangeDetectorRef,
  ViewChild,
  ViewContainerRef,
   ComponentFactoryResolver,
  type ComponentRef,
} from "@angular/core"
import {  Router, NavigationEnd } from "@angular/router"
import  { FormBuilder, FormGroup } from "@angular/forms"
import  { DepartementsService } from "../departements.service"
import  { SpecialitesService } from "../specialites.service"
import  { NiveauxService } from "../niveaux.service"
import  { CoursService } from "../cours.service"
import  { EnseignantService } from "../enseignant.service"
import  { VoeuxService, Voeux, StatusUpdate } from "../voeux.service"
import  { AssignationService } from "../assignation.service"
import  { GroupeService } from "../groupe.service"
import  { MatSnackBar } from "@angular/material/snack-bar"
import { forkJoin, type Subscription } from "rxjs"

// Ajouter ces imports au début du fichier, après les imports existants
import { CourComponent } from "../deuxieme-interface/cour/cour.component"
import { DevoirComponent } from "../deuxieme-interface/devoir/devoir.component"
import { QuizComponent } from "../deuxieme-interface/quiz/quiz.component"
import { MessageComponent } from "../deuxieme-interface/message/message.component"
import { VoeuxComponent } from "../deuxieme-interface/voeux/voeux.component"

interface Notification {
  id: number
  sender: string
  message: string
  time: string
  read: boolean
  avatar?: string
}

// Interface pour les enseignants
interface Enseignant {
  _id: string
  nom: string
  prenom: string
  email: string
  departement: string
  specialite: string
  grade: string
  experience: number
  status?: string // Ajout du statut comme optionnel
}

// Interface pour les groupes
interface Groupe {
  _id: string
  nom: string
  filiere: string
  niveau: string
  nbEtudiants: number
  nbFilieres: number
  nbGroupes: number
  status?: string
}

// Interface pour les filières (pour la compatibilité avec le service)
interface Filiere {
  _id: string
  nbFilieres?: number
  nbGroupes?: number
  [key: string]: any // Pour permettre d'autres propriétés
}

@Component({
  selector: "app-chef-departement",
  templateUrl: "./chef-departement.component.html",
  styleUrls: ["./chef-departement.component.css"],
})
export class ChefDepartementComponent implements OnInit {
  // Informations du chef de département
  chefName = "Mohammed Karim"
  chefEmail = "mohammed.karim@univ.edu"
  chefCIN = "87654321"
  departement = "Informatique"
  specialite = "Systèmes d'Information"
  grade = "Professeur"
  experience = "20"

  // Pour l'affichage dans le template
  nom = "Mohammed"
  prenom = "Karim"
  email = "mohammed.karim@univ.edu"

  // Statistiques
  coursStats = {
    total: 0,
    active: 0,
    draft: 0,
  }

  voeuxStats = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  }

  enseignantStats = {
    total: 0,
    active: 0,
    inactive: 0,
  }

  assignationStats = {
    total: 0,
    completed: 0,
    pending: 0,
  }

  groupeStats = {
    total: 0,
    active: 0,
    inactive: 0,
  }

  // Composant actif
  activeComponent = "dashboard"

  // Notifications
  showNotifications = false
  notifications: Notification[] = []
  messageStats = {
    total: 0,
    unread: 0,
    sent: 0,
  }

  // États du menu - tous fermés par défaut
  showCourSubmenu = false
  showSemestreSubmenu: { [key: number]: boolean } = { 1: false, 2: false }
  showVoeuxSubmenu = false
  showAssignationSubmenu = false
  showGroupesSubmenu = false

  // Matières par semestre
  matieresSemestre1: any[] = []
  matieresSemestre2: any[] = []

  // Chargement des données
  isLoading = true
  loadingError = false

  // Listes de données
  departements: any[] = []
  specialites: any[] = []
  niveaux: any[] = []
  cours: any[] = []
  enseignants: Enseignant[] = []
  voeux: Voeux[] = [] // Utiliser l'interface du service
  filteredVoeux: Voeux[] = [] // Utiliser l'interface du service
  groupes: Groupe[] = []

  // Filtres pour les voeux
  voeuxFilters = {
    status: "all",
    semestre: "all",
    departement: "all",
    specialite: "all",
    niveau: "all",
    typeSeance: "all",
  }

  // Formulaires
  voeuxFilterForm!: FormGroup
  assignationForm!: FormGroup
  groupeForm!: FormGroup

  // Subscriptions
  private subscriptions: Subscription[] = []

  // Ajouter ces propriétés dans la classe ChefDepartementComponent
  @ViewChild("dynamicComponentContainer", { read: ViewContainerRef, static: false })
  dynamicComponentContainer!: ViewContainerRef
  private currentComponentRef: ComponentRef<any> | null = null

  constructor(
    private fb: FormBuilder,
    private departementsService: DepartementsService,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private coursService: CoursService,
    private enseignantService: EnseignantService,
    private voeuxService: VoeuxService,
    private assignationService: AssignationService,
    private groupeService: GroupeService,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef, // Ajout du ChangeDetectorRef
    private componentFactoryResolver: ComponentFactoryResolver, // Ajouter cette ligne
  ) {
    // Écouter les événements de navigation pour mettre à jour l'état actif
    this.subscriptions.push(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.updateActiveState(event.url)
        }
      }),
    )
  }

  ngOnInit(): void {
    this.loadAllData()
    this.initializeForms()
    this.loadNotifications()

    // Initialiser l'état actif en fonction de l'URL actuelle
    this.updateActiveState(this.router.url)
  }

  ngOnDestroy(): void {
    // Désabonner de toutes les souscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  // Charger toutes les données nécessaires
  loadAllData(): void {
    this.isLoading = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    const dataSources = forkJoin({
      cours: this.coursService.getCours(),
      departements: this.departementsService.getDepartements(),
      specialites: this.specialitesService.getSpecialites(),
      niveaux: this.niveauxService.getNiveaux(),
      enseignants: this.enseignantService.getEnseignants(),
      voeux: this.voeuxService.getAllVoeux(),
      voeuxStats: this.voeuxService.getVoeuxStats(),
      groupes: this.groupeService.getGroupes(),
    })

    this.subscriptions.push(
      dataSources.subscribe({
        next: (data) => {
          // Traiter les données reçues
          this.cours = data.cours
          this.departements = data.departements
          this.specialites = data.specialites
          this.niveaux = data.niveaux
          this.enseignants = data.enseignants

          // Utiliser directement les voeux du service
          this.voeux = data.voeux
          this.filteredVoeux = [...this.voeux] // Initialiser les voeux filtrés

      
          // Mettre à jour les statistiques
          this.voeuxStats = data.voeuxStats
          this.updateStats()

          // Charger les matières par semestre
          this.loadMatieresParSemestre()

          this.isLoading = false
          this.cdr.detectChanges() // Forcer la détection des changements
        },
        error: (error) => {
          console.error("Erreur lors du chargement des données:", error)
          this.loadingError = true
          this.isLoading = false
          this.showNotification("Erreur de chargement des données", "error")
          this.cdr.detectChanges() // Forcer la détection des changements
        },
      }),
    )
  }



  // Initialiser les formulaires
  initializeForms(): void {
    // Formulaire de filtrage des voeux
    this.voeuxFilterForm = this.fb.group({
      status: ["all"],
      semestre: ["all"],
      departement: ["all"],
      specialite: ["all"],
      niveau: ["all"],
      typeSeance: ["all"],
    })

    // Écouter les changements de valeurs pour filtrer automatiquement
    this.voeuxFilterForm.valueChanges.subscribe(() => {
      this.voeuxFilters = this.voeuxFilterForm.value
      this.filterVoeux()
    })

    // Formulaire d'assignation
    this.assignationForm = this.fb.group({
      enseignantId: [""],
      matieres: this.fb.array([]),
    })

    // Formulaire de groupe
    this.groupeForm = this.fb.group({
      nom: [""],
      filiere: [""],
      niveau: [""],
      nbEtudiants: [0],
      nbFilieres: [1],
      nbGroupes: [1],
    })
  }

  // Mettre à jour les statistiques
  updateStats(): void {
    // Statistiques des cours
    this.coursStats = {
      total: this.cours.length,
      active: this.cours.filter((c) => c.status === "active").length || 0,
      draft: this.cours.filter((c) => c.status === "draft").length || 0,
    }

    // Statistiques des enseignants - avec vérification de l'existence du statut
    this.enseignantStats = {
      total: this.enseignants.length,
      active: this.enseignants.filter((e) => e.status === "active").length || 0,
      inactive: this.enseignants.filter((e) => e.status !== "active").length || 0,
    }

    // Statistiques des assignations (simulées)
    this.assignationStats = {
      total: this.voeux.length,
      completed: this.voeux.filter((v) => v.status === "approved").length,
      pending: this.voeux.filter((v) => v.status === "pending").length,
    }

    // Statistiques des groupes - avec vérification de l'existence du statut
    this.groupeStats = {
      total: this.groupes.length,
      active: this.groupes.filter((g) => g.status === "active").length || 0,
      inactive: this.groupes.filter((g) => g.status !== "active").length || 0,
    }
  }

  // Charger les matières par semestre
  loadMatieresParSemestre(): void {
    // Semestre 1
    this.matieresSemestre1 = this.cours
      .filter((cours) => cours.semestre === 1)
      .map((cours) => ({
        id: cours._id,
        nom: cours.titre,
        departement: cours.departement || "Informatique",
        niveau: cours.niveau || "Licence 3",
        type: "Cours",
        icon: "code",
      }))

    // Semestre 2
    this.matieresSemestre2 = this.cours
      .filter((cours) => cours.semestre === 2)
      .map((cours) => ({
        id: cours._id,
        nom: cours.titre,
        departement: cours.departement || "Informatique",
        niveau: cours.niveau || "Licence 3",
        type: "Cours",
        icon: "code",
      }))
  }

  // Charger les notifications
  loadNotifications(): void {
    // Simuler le chargement des notifications
    this.notifications = [
      {
        id: 1,
        sender: "Système",
        avatar: "S",
        message: "5 nouveaux voeux en attente d'approbation",
        time: "Il y a 30 minutes",
        read: false,
      },
      {
        id: 2,
        sender: "Israa Bribech",
        avatar: "I",
        message: "A soumis ses voeux pour le semestre 1",
        time: "Il y a 2 heures",
        read: false,
      },
      {
        id: 3,
        sender: "Ahmed Taleb",
        avatar: "A",
        message: "A demandé une modification d'assignation",
        time: "Hier",
        read: true,
      },
    ]

    this.updateUnreadCount()
  }

  // Mettre à jour l'état actif en fonction de l'URL
  updateActiveState(url: string): void {
    if (url.includes("/chef-departement")) {
      this.activeComponent = "dashboard"
    } else if (url.includes("/cour")) {
      this.activeComponent = "cours"
      this.showCourSubmenu = true
    } else if (url.includes("/voeux")) {
      this.activeComponent = "voeux"
      this.showVoeuxSubmenu = true
    } else if (url.includes("/assignation")) {
      this.activeComponent = "assignation"
      this.showAssignationSubmenu = true
    } else if (url.includes("/groupes")) {
      this.activeComponent = "groupes"
      this.showGroupesSubmenu = true
    }
  }

  // Fermer les notifications quand on clique ailleurs
  @HostListener("document:click", ["$event"])
  clickOutside(event: Event): void {
    const notificationIcon = document.querySelector(".notification-icon")
    const notificationDropdown = document.querySelector(".notification-dropdown")

    if (notificationIcon && notificationDropdown) {
      if (!notificationIcon.contains(event.target as Node) && !notificationDropdown.contains(event.target as Node)) {
        this.showNotifications = false
      }
    }
  }

  // Basculer l'affichage des notifications
  toggleNotifications(event: Event): void {
    event.stopPropagation()
    this.showNotifications = !this.showNotifications
  }

  // Marquer une notification comme lue
  markAsRead(notification: Notification): void {
    notification.read = true
    this.updateUnreadCount()
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): void {
    this.notifications.forEach((notification) => {
      notification.read = true
    })
    this.updateUnreadCount()
  }

  // Mettre à jour le compteur de messages non lus
  updateUnreadCount(): void {
    this.messageStats.unread = this.notifications.filter((n) => !n.read).length
  }

  // Supprimer une notification
  deleteNotification(id: number, event: Event): void {
    event.stopPropagation()
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.updateUnreadCount()
  }

  // Méthode pour basculer l'affichage du sous-menu Cours
  toggleCourSubmenu(event: Event): void {
    event.stopPropagation() // Empêcher la propagation de l'événement
    this.showCourSubmenu = !this.showCourSubmenu

    // Fermer les sous-menus de semestre si on ferme le menu cours
    if (!this.showCourSubmenu) {
      this.showSemestreSubmenu = { 1: false, 2: false }
    }
  }

  // Méthode pour basculer l'affichage du sous-menu Semestre
  toggleSemestreSubmenu(event: Event, semestre: number): void {
    event.stopPropagation() // Empêcher la propagation de l'événement
    this.showSemestreSubmenu[semestre] = !this.showSemestreSubmenu[semestre]
  }

  // Méthode pour basculer l'affichage du sous-menu Voeux
  toggleVoeuxSubmenu(event: Event): void {
    event.stopPropagation()
    this.showVoeuxSubmenu = !this.showVoeuxSubmenu
  }

  // Méthode pour basculer l'affichage du sous-menu Assignation
  toggleAssignationSubmenu(event: Event): void {
    event.stopPropagation()
    this.showAssignationSubmenu = !this.showAssignationSubmenu
  }

  // Méthode pour basculer l'affichage du sous-menu Groupes
  toggleGroupesSubmenu(event: Event): void {
    event.stopPropagation()
    this.showGroupesSubmenu = !this.showGroupesSubmenu
  }

  // Naviguer vers la page de cours pour une matière spécifique
  navigateToMatiere(event: Event, matiereId: number, semestre: number): void {
    event.stopPropagation() // Empêcher la propagation de l'événement
    event.preventDefault() // Empêcher la navigation par défaut
    console.log(`Switching to cours component with matiere: ${matiereId}, semestre: ${semestre}`)

    // Au lieu de naviguer, on change simplement le composant actif
    this.activeComponent = "cours"

    // Mettre à jour le titre de la page
    const headerTitle = document.querySelector(".header-title h1")
    if (headerTitle) {
      headerTitle.textContent = "Gestion des cours"
    }

    // Forcer la détection des changements
    this.cdr.detectChanges()
  }

  // Méthode pour obtenir la couleur de fond selon le type de cours
  getCoursColor(type: string): string {
    switch (type) {
      case "Cours":
        return "#6366f1"
      case "TD":
        return "#f59e0b"
      case "TP":
        return "#10b981"
      default:
        return "#6366f1"
    }
  }

  // Méthode modifiée pour gérer la navigation entre les composants
  switchComponent(component: string): void {
    event?.preventDefault() // Empêcher la navigation par défaut si un événement est disponible
    console.log(`Switching to component: ${component}`) // Log pour déboguer
    this.activeComponent = component

    // Mettre à jour le titre de la page en fonction du composant actif
    const headerTitle = document.querySelector(".header-title h1")
    if (headerTitle) {
      switch (component) {
        case "dashboard":
          headerTitle.textContent = "Tableau de bord - Chef de Département"
          break
        case "cours":
          headerTitle.textContent = "Gestion des cours"
          break
        case "devoir":
          headerTitle.textContent = "Gestion des devoirs"
          break
        case "quiz":
          headerTitle.textContent = "Gestion des quiz"
          break
        case "message":
          headerTitle.textContent = "Messagerie"
          break
        case "voeux":
          headerTitle.textContent = "Gestion des voeux"
          break
        case "enseignants":
          headerTitle.textContent = "Gestion des enseignants"
          break
        case "assignation":
          headerTitle.textContent = "Gestion des assignations"
          break
        case "groupes":
          headerTitle.textContent = "Gestion des groupes"
          break
        default:
          headerTitle.textContent = "Tableau de bord - Chef de Département"
      }
    }

    // Charger le composant dynamiquement si le conteneur est disponible
    if (this.dynamicComponentContainer) {
      this.loadDynamicComponent(component)
    } else {
      // Si le conteneur n'est pas encore disponible, attendre le prochain cycle de détection
      setTimeout(() => {
        if (this.dynamicComponentContainer) {
          this.loadDynamicComponent(component)
        }
      }, 0)
    }

    // Forcer la détection des changements après avoir mis à jour activeComponent
    this.cdr.detectChanges()
  }

  // Ajouter cette nouvelle méthode pour charger les composants dynamiquement
  loadDynamicComponent(componentType: string): void {
    // Nettoyer le composant précédent s'il existe
    if (this.currentComponentRef) {
      this.currentComponentRef.destroy()
      this.currentComponentRef = null
    }

    // Ne pas charger de composant dynamique pour le dashboard
    if (componentType === "dashboard") {
      return
    }

    // Créer une factory pour le composant approprié
    switch (componentType) {
      case "cours":
        const coursFactory = this.componentFactoryResolver.resolveComponentFactory(CourComponent)
        this.currentComponentRef = this.dynamicComponentContainer.createComponent(coursFactory)
        break
      case "devoir":
        const devoirFactory = this.componentFactoryResolver.resolveComponentFactory(DevoirComponent)
        this.currentComponentRef = this.dynamicComponentContainer.createComponent(devoirFactory)
        break
      case "quiz":
        const quizFactory = this.componentFactoryResolver.resolveComponentFactory(QuizComponent)
        this.currentComponentRef = this.dynamicComponentContainer.createComponent(quizFactory)
        break
      case "message":
        const messageFactory = this.componentFactoryResolver.resolveComponentFactory(MessageComponent)
        this.currentComponentRef = this.dynamicComponentContainer.createComponent(messageFactory)
        break
      case "voeux":
        const voeuxFactory = this.componentFactoryResolver.resolveComponentFactory(VoeuxComponent)
        this.currentComponentRef = this.dynamicComponentContainer.createComponent(voeuxFactory)
        break
      default:
        return // Ne rien faire si le composant n'est pas reconnu
    }

    // Détecter les changements pour s'assurer que le composant est rendu
    this.cdr.detectChanges()

    console.log(`Component ${componentType} loaded dynamically`)
  }

  // Filtrer les voeux en fonction des critères sélectionnés
  filterVoeux(): void {
    this.filteredVoeux = this.voeux.filter((voeu) => {
      // Filtrer par statut
      if (this.voeuxFilters.status !== "all" && voeu.status !== this.voeuxFilters.status) {
        return false
      }

      // Filtrer par semestre
      if (this.voeuxFilters.semestre !== "all" && voeu.semestre !== this.voeuxFilters.semestre) {
        return false
      }

      // Filtrer par département
      if (this.voeuxFilters.departement !== "all" && voeu.departement !== this.voeuxFilters.departement) {
        return false
      }

      // Filtrer par spécialité
      if (this.voeuxFilters.specialite !== "all" && voeu.specialite !== this.voeuxFilters.specialite) {
        return false
      }

      // Filtrer par niveau
      if (this.voeuxFilters.niveau !== "all" && voeu.niveau !== this.voeuxFilters.niveau) {
        return false
      }

      // Filtrer par type de séance (si au moins une matière a ce type)
      if (this.voeuxFilters.typeSeance !== "all") {
        if (!voeu.typesSeance || !voeu.typesSeance.includes(this.voeuxFilters.typeSeance)) {
          return false
        }
      }

      return true
    })
  }

  // Approuver un voeu - Correction du type StatusUpdate
  approuveVoeu(voeuId: string): void {
    const statusUpdate: StatusUpdate = {
      status: "approved",
    }

    this.voeuxService.updateVoeuxStatus(voeuId, statusUpdate).subscribe({
      next: (response) => {
        // Mettre à jour le statut dans la liste locale
        const index = this.voeux.findIndex((v) => v._id === voeuId)
        if (index !== -1) {
          this.voeux[index].status = "approved"
          this.filterVoeux() // Réappliquer les filtres
        }
        this.showNotification("Voeu approuvé avec succès", "success")
      },
      error: (error) => {
        console.error("Erreur lors de l'approbation du voeu:", error)
        this.showNotification("Erreur lors de l'approbation du voeu", "error")
      },
    })
  }

  // Rejeter un voeu - Correction du type StatusUpdate
  rejetVoeu(voeuId: string): void {
    const statusUpdate: StatusUpdate = {
      status: "rejected",
    }

    this.voeuxService.updateVoeuxStatus(voeuId, statusUpdate).subscribe({
      next: (response) => {
        // Mettre à jour le statut dans la liste locale
        const index = this.voeux.findIndex((v) => v._id === voeuId)
        if (index !== -1) {
          this.voeux[index].status = "rejected"
          this.filterVoeux() // Réappliquer les filtres
        }
        this.showNotification("Voeu rejeté", "info")
      },
      error: (error) => {
        console.error("Erreur lors du rejet du voeu:", error)
        this.showNotification("Erreur lors du rejet du voeu", "error")
      },
    })
  }

  // Afficher une notification
  showNotification(message: string, type: "success" | "error" | "info" = "info"): void {
    this.snackBar.open(message, "Fermer", {
      duration: 3000,
      panelClass: [`snackbar-${type}`],
    })
  }

  // Obtenir le nom d'un département à partir de son ID
  getDepartementName(id: string): string {
    const dept = this.departements.find((d) => d._id === id || d.id === id)
    return dept ? dept.name || dept.nom : ""
  }

  // Obtenir le nom d'une spécialité à partir de son ID
  getSpecialiteName(id: string): string {
    const specialite = this.specialites.find((s) => s._id === id || s.id === id)
    return specialite ? specialite.name || specialite.nom : ""
  }

  // Obtenir le nom d'un niveau à partir de son ID
  getNiveauName(id: string): string {
    const niveau = this.niveaux.find((n) => n._id === id || n.id === id)
    return niveau ? niveau.name || niveau.nom : ""
  }

  // Obtenir le nom d'un enseignant à partir de son ID
  getEnseignantName(id: string): string {
    const enseignant = this.enseignants.find((e) => e._id === id)
    if (enseignant) {
      return `${enseignant.prenom} ${enseignant.nom}`
    }
    return "Enseignant inconnu"
  }

  // Obtenir le nom d'une matière à partir de son ID
  getMatiereName(id: string): string {
    const cours = this.cours.find((c) => c._id === id)
    return cours ? cours.titre : "Matière inconnue"
  }

  // Obtenir la classe CSS pour le statut d'un voeu
  getStatusClass(status: string): string {
    switch (status) {
      case "approved":
        return "status-approved"
      case "rejected":
        return "status-rejected"
      case "pending":
        return "status-pending"
      default:
        return ""
    }
  }

  // Obtenir le libellé pour le statut d'un voeu
  getStatusLabel(status: string): string {
    switch (status) {
      case "approved":
        return "Approuvé"
      case "rejected":
        return "Rejeté"
      case "pending":
        return "En attente"
      default:
        return status
    }
  }
}
