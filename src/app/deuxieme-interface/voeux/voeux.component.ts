import { Component, type OnInit, HostListener, type OnDestroy } from "@angular/core"
import  { FormBuilder, FormGroup, FormArray } from "@angular/forms"
import {  Router, NavigationEnd,  ActivatedRoute } from "@angular/router"
import  { Location } from "@angular/common"
import  { CoursService, Cours } from "../../cours.service"
import  { DepartementsService } from "../../departements.service"
import  { SpecialitesService } from "../../specialites.service"
import  { NiveauxService } from "../../niveaux.service"
import  { VoeuxService, Voeux } from "../../voeux.service"
import  { EnseignantService } from "../../enseignant.service"
import  { GroupeService, Filiere } from "../../groupe.service"
import { forkJoin, type Subscription } from "rxjs"

interface Matiere {
  id: string
  nom: string
  departement: string
  specialite: string
  niveau: string
  heures: number
  isApproved?: boolean
}

interface Notification {
  id: number
  sender: string
  message: string
  time: string
  read: boolean
  avatar?: string
}

// Interface pour la charge horaire
// Définition de l'interface ChargeHoraire
interface ChargeHoraire {
  base: number
  supplementaire: number
  total: number
  // Ajout des valeurs hebdomadaires
  baseHebdo: number
  supplementaireHebdo: number
  totalHebdo: number
}

// Interface pour les heures actuelles
interface HeuresActuelles {
  cours: number
  td: number
  tp: number
  cours_filiere: number
  td_groupe: number
  tp_groupe: number
}

// Interface pour les conversions
interface ConversionHeures {
  coursTD: number
  tpTD: number
  totalTD: number
}

@Component({
  selector: "app-voeux",
  templateUrl: "./voeux.component.html",
  styleUrls: ["./voeux.component.css"],
})
export class VoeuxComponent implements OnInit, OnDestroy {
  // Informations de l'enseignant
  enseignantName = "Israa Bribech"
  enseignantEmail = "israabribech2002@gmail.com"
  enseignantCIN = "12345678"
  departement = "Informatique"
  specialite = "Développement Web"
  grade = "Maitre Assistant"
  experience = "15"

  // Pour l'affichage dans le template
  nom = "Israa"
  prenom = "Bribech"
  email = "israabribech2002@gmail.com"

  // Statistiques
  coursStats = {
    total: 0,
    active: 0,
    draft: 0,
  }

  chapitreStats = {
    total: 0,
    published: 0,
    draft: 0,
  }

  devoirStats = {
    total: 0,
    pending: 0,
    graded: 0,
  }

  quizStats = {
    total: 0,
    active: 0,
    completed: 0,
  }

  messageStats = {
    total: 0,
    unread: 0,
    sent: 0,
  }

  voeuxStats = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  }

  // Formulaires pour les semestres
  semestre1Form!: FormGroup
  semestre2Form!: FormGroup

  // Liste des matières disponibles
  matieres: Matiere[] = []

  // Liste des matières déjà attribuées (non disponibles)
  unavailableMatieres: string[] = []

  // Filtres
  filteredMatieresSemestre1: Matiere[] = []
  filteredMatieresSemestre2: Matiere[] = []

  // Départements, Niveaux et Spécialités
  departements: any[] = []
  niveaux: any[] = []
  specialites: any[] = []
  cours: Cours[] = []
  filieres: Filiere[] = [] // Ajout des filières

  // Statut de soumission
  semestre1Submitted = false
  semestre2Submitted = false

  // Onglet actif
  activeTab: "semestre1" | "semestre2" = "semestre1"

  // Notifications
  showNotifications = false
  notifications: Notification[] = []

  // Modal actif
  activeModal: string | null = null

  // Semestre sélectionné
  selectedSemestre: number | null = null

  // États du menu - tous fermés par défaut
  showCourSubmenu = false
  showSemestreSubmenu: { [key: number]: boolean } = { 1: false, 2: false }

  // Matières par semestre avec ajout du type (Cours, TD, TP)
  matieresSemestre1: any[] = []
  matieresSemestre2: any[] = []

  // Afficher la liste des matières
  showMatieresList = false

  // Chargement des données
  isLoading = true
  loadingError = false

  // Voeux existants
  existingVoeux: Voeux[] = []

  // Charge horaire de l'enseignant
  chargeHoraire: ChargeHoraire = {
    base: 0,
    supplementaire: 0,
    total: 0,
    baseHebdo: 0,
    supplementaireHebdo: 0,
    totalHebdo: 0,
  }

  // Heures actuelles par type
  heuresActuelles: HeuresActuelles = {
    cours: 0,
    td: 0,
    tp: 0,
    cours_filiere: 0,
    td_groupe: 0,
    tp_groupe: 0,
  }

  // Conversion des heures
  conversionHeures: ConversionHeures = {
    coursTD: 0,
    tpTD: 0,
    totalTD: 0,
  }

  // Options pour les sélecteurs
  heuresOptions: number[] = [14, 21, 28, 35, 42, 49, 56]
  filieresOptions: number[] = [] // Sera rempli depuis le service
  groupesOptions: number[] = [] // Sera rempli depuis le service

  // Constantes pour les calculs
  private readonly DUREE_SEANCE = 1.5 // Durée de chaque séance en heures
  private readonly COEF_COURS_TD = 1.83 // Coefficient de conversion Cours -> TD
  private readonly COEF_TP_TD = 0.86 // Coefficient de conversion TP -> TD
  private readonly HEURES_PAR_SEANCE = 21 // Nombre d'heures par séance

  // Limite stricte de charge horaire
  private readonly LIMITE_CHARGE_HORAIRE = 13.5 // Limite stricte en heures hebdomadaires

  // Subscriptions
  private subscriptions: Subscription[] = []

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private coursService: CoursService,
    private departementsService: DepartementsService,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private voeuxService: VoeuxService,
    private enseignantService: EnseignantService,
    private groupeService: GroupeService, // Ajout du GroupeService
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
    this.initForms()
    this.loadNotifications()

    // Initialiser l'état actif en fonction de l'URL actuelle
    this.updateActiveState(this.router.url)

    // Vérifier si nous sommes sur une page spécifique au chargement
    if (this.router.url.includes("/cour")) {
      this.route.queryParams.subscribe((params) => {
        if (params["semestre"]) {
          const semestre = Number.parseInt(params["semestre"])
        }
      })
    }

    // Calculer la charge horaire initiale
    this.updateChargeHoraire()

    // Désactiver la modification des heures
    this.disableHeuresModification()
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
      voeux: this.voeuxService.getVoeuxByEnseignant("67c4c2f07fe25e5361a1e1bf"), // ID de l'enseignant connecté
      stats: this.voeuxService.getVoeuxStats(),
      filieres: this.groupeService.getGroupes(), // Ajout des filières
    })

    this.subscriptions.push(
      dataSources.subscribe({
        next: (data) => {
          // Traiter les données reçues
          this.cours = data.cours
          this.departements = data.departements
          this.specialites = data.specialites
          this.niveaux = data.niveaux
          this.existingVoeux = data.voeux
          this.filieres = data.filieres // Stocker les filières

          // Extraire les options de filières et groupes depuis les données
          this.extractFilieresAndGroupesOptions()

          // Mettre à jour les statistiques
          this.voeuxStats = {
            total: data.stats.total,
            approved: data.stats.approved,
            pending: data.stats.pending,
            rejected: data.stats.rejected,
          }

          // Convertir les cours en matières
          this.matieres = this.cours.map((cours) => ({
            id: cours._id,
            nom: cours.titre,
            departement: cours.departement || "",
            specialite: cours.specialite || "",
            niveau: cours.niveau || "",
            heures: cours.heure || (cours.heures ? Number.parseInt(cours.heures) : 21), // Utiliser la valeur d'heures du cours
            isApproved: false,
          }))

          // Identifier les matières déjà approuvées
          this.identifyApprovedMatieres()

          // Initialiser les matières filtrées
          this.filteredMatieresSemestre1 = [...this.matieres]
          this.filteredMatieresSemestre2 = [...this.matieres]

          // Charger les matières par semestre
          this.loadMatieresParSemestre()

          // Vérifier si l'enseignant a déjà soumis des voeux
          this.checkExistingVoeux()

          // Calculer la charge horaire
          this.updateChargeHoraire()

          this.isLoading = false
        },
        error: (error) => {
          console.error("Erreur lors du chargement des données:", error)
          this.loadingError = true
          this.isLoading = false
        },
      }),
    )
  }

  // Méthode pour obtenir les heures d'un cours à partir de son ID
  getHeuresByCourId(courId: string): number {
    const cours = this.cours.find((c) => c._id === courId)
    if (cours) {
      // Utiliser heure (number) ou convertir heures (string) en nombre si nécessaire
      return cours.heure || (cours.heures ? Number.parseInt(cours.heures) : 21)
    }
    return 21 // Valeur par défaut si le cours n'est pas trouvé
  }

  // Ajouter cette nouvelle méthode pour gérer le changement du champ d'heures numérique
  onHeuresInputChange(event: Event, semestre: number, index: number): void {
    const inputElement = event.target as HTMLInputElement
    if (inputElement) {
      // Convertir la valeur en nombre et s'assurer qu'elle est valide
      let value = Number.parseInt(inputElement.value, 10)

      // Vérifier que la valeur est un nombre valide et dans les limites
      if (isNaN(value) || value < 1) {
        value = 1 // Valeur minimale par défaut
        inputElement.value = "1"
      } else if (value > 100) {
        value = 100 // Valeur maximale
        inputElement.value = "100"
      }

      // Mettre à jour la valeur dans le formulaire
      this.updateHeures(semestre, index, value)
    }
  }

  // Extraire les options de filières et groupes depuis les données
  extractFilieresAndGroupesOptions(): void {
    // Extraire les nombres de filières uniques
    const filieresSet = new Set<number>()
    // Extraire les nombres de groupes uniques
    const groupesSet = new Set<number>()

    // Parcourir les filières pour extraire les nombres
    this.filieres.forEach((filiere) => {
      if (filiere.nbFilieres) {
        filieresSet.add(filiere.nbFilieres)
      }
      if (filiere.nbGroupes) {
        groupesSet.add(filiere.nbGroupes)
      }
    })

    // Si aucune donnée n'est disponible, utiliser des valeurs par défaut
    if (filieresSet.size === 0) {
      this.filieresOptions = [1, 2, 3, 4, 5]
    } else {
      this.filieresOptions = Array.from(filieresSet).sort((a, b) => a - b)
    }

    if (groupesSet.size === 0) {
      this.groupesOptions = [1, 2, 3, 4, 5, 6, 7, 8]
    } else {
      this.groupesOptions = Array.from(groupesSet).sort((a, b) => a - b)
    }
  }

  // Identifier les matières déjà approuvées
  identifyApprovedMatieres(): void {
    // Récupérer les voeux approuvés
    const approvedVoeux = this.existingVoeux.filter((voeu) => voeu.status === "approved")

    // Extraire les IDs des matières approuvées
    this.unavailableMatieres = []

    approvedVoeux.forEach((voeu) => {
      if (voeu.matieres && voeu.matieres.length > 0) {
        this.unavailableMatieres.push(...voeu.matieres)
      }
    })

    // Marquer les matières comme approuvées
    this.matieres.forEach((matiere) => {
      matiere.isApproved = this.unavailableMatieres.includes(matiere.id)
    })
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

  // Vérifier si l'enseignant a déjà soumis des voeux
  checkExistingVoeux(): void {
    // Vérifier les voeux pour le semestre 1
    const voeux1 = this.existingVoeux.find((v) => v.semestre === "1")
    if (voeux1) {
      this.semestre1Submitted = true

      // Pré-remplir le formulaire avec les voeux existants
      if (voeux1.matieres && voeux1.matieres.length > 0) {
        voeux1.matieres.forEach((matiereId, index) => {
          const matiere = this.matieres.find((m) => m.id === matiereId)
          if (matiere) {
            this.toggleMatiere(1, matiere)
            // Si les types de séance sont disponibles, les appliquer
            if (voeux1.typesSeance && voeux1.typesSeance[index]) {
              const form = this.semestre1Form
              const matieresArray = form.get("matieres") as FormArray
              const matiereIndex = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiereId)
              if (matiereIndex !== -1) {
                this.updateTypeSeance(1, matiereIndex, voeux1.typesSeance[index])
              }
            }

            // Si les nombres de filières sont disponibles, les appliquer
            if (voeux1.nbFilieres && voeux1.nbFilieres[index]) {
              const form = this.semestre1Form
              const matieresArray = form.get("matieres") as FormArray
              const matiereIndex = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiereId)
              if (matiereIndex !== -1) {
                this.updateNbFilieres(1, matiereIndex, voeux1.nbFilieres[index])
              }
            }

            // Si les nombres de groupes sont disponibles, les appliquer
            if (voeux1.nbGroupes && voeux1.nbGroupes[index]) {
              const form = this.semestre1Form
              const matieresArray = form.get("matieres") as FormArray
              const matiereIndex = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiereId)
              if (matiereIndex !== -1) {
                this.updateNbGroupes(1, matiereIndex, voeux1.nbGroupes[index])
              }
            }
          }
        })
      }
    }

    // Vérifier les voeux pour le semestre 2
    const voeux2 = this.existingVoeux.find((v) => v.semestre === "2")
    if (voeux2) {
      this.semestre2Submitted = true

      // Pré-remplir le formulaire avec les voeux existants
      if (voeux2.matieres && voeux2.matieres.length > 0) {
        voeux2.matieres.forEach((matiereId, index) => {
          const matiere = this.matieres.find((m) => m.id === matiereId)
          if (matiere) {
            this.toggleMatiere(2, matiere)
            // Si les types de séance sont disponibles, les appliquer
            if (voeux2.typesSeance && voeux2.typesSeance[index]) {
              const form = this.semestre2Form
              const matieresArray = form.get("matieres") as FormArray
              const matiereIndex = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiereId)
              if (matiereIndex !== -1) {
                this.updateTypeSeance(2, matiereIndex, voeux2.typesSeance[index])
              }
            }

            // Si les nombres de filières sont disponibles, les appliquer
            if (voeux2.nbFilieres && voeux2.nbFilieres[index]) {
              const form = this.semestre2Form
              const matieresArray = form.get("matieres") as FormArray
              const matiereIndex = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiereId)
              if (matiereIndex !== -1) {
                this.updateNbFilieres(2, matiereIndex, voeux2.nbFilieres[index])
              }
            }

            // Si les nombres de groupes sont disponibles, les appliquer
            if (voeux2.nbGroupes && voeux2.nbGroupes[index]) {
              const form = this.semestre2Form
              const matieresArray = form.get("matieres") as FormArray
              const matiereIndex = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiereId)
              if (matiereIndex !== -1) {
                this.updateNbGroupes(2, matiereIndex, voeux2.nbGroupes[index])
              }
            }
          }
        })
      }
    }

    // Mettre à jour les heures actuelles
    this.updateHeuresActuelles()
  }

  // Charger les notifications
  loadNotifications(): void {
    // Simuler le chargement des notifications
    this.notifications = [
      {
        id: 1,
        sender: "Ahmed Ben Ali",
        avatar: "A",
        message: "A soumis le devoir de programmation",
        time: "Il y a 2 heures",
        read: false,
      },
      {
        id: 2,
        sender: "Fatima Trabelsi",
        avatar: "F",
        message: "A posé une question sur le cours",
        time: "Il y a 5 heures",
        read: false,
      },
      {
        id: 3,
        sender: "Omar Mansouri",
        avatar: "O",
        message: "A terminé le quiz d'algorithmes",
        time: "Hier",
        read: false,
      },
    ]

    this.updateUnreadCount()
  }

  // Mettre à jour l'état actif en fonction de l'URL
  updateActiveState(url: string): void {
    // Réinitialiser les états des sous-menus si on n'est pas sur la page correspondante
    if (!url.includes("/cour")) {
      this.showCourSubmenu = false
      this.showSemestreSubmenu = { 1: false, 2: false }
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

  // Naviguer vers la page de cours pour une matière spécifique
  navigateToMatiere(event: Event, matiereId: number, semestre: number): void {
    event.stopPropagation() // Empêcher la propagation de l'événement
    console.log(`Navigating to matiere: ${matiereId}, semestre: ${semestre}`)
    this.router.navigate(["/cour"], {
      queryParams: {
        matiereId: matiereId,
        semestre: semestre,
      },
    })
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

  initForms(): void {
    // Initialiser le formulaire pour le semestre 1
    this.semestre1Form = this.fb.group({
      departement: [""],
      specialite: [""],
      niveau: [""],
      matieres: this.fb.array([]),
    })

    // Initialiser le formulaire pour le semestre 2
    this.semestre2Form = this.fb.group({
      departement: [""],
      specialite: [""],
      niveau: [""],
      matieres: this.fb.array([]),
    })

    // Ajouter des écouteurs pour les changements de valeurs
    this.semestre1Form.get("departement")?.valueChanges.subscribe((value) => {
      this.onDepartementChange(1, value)
    })

    this.semestre1Form.get("specialite")?.valueChanges.subscribe(() => {
      this.filterMatieres(1)
    })

    this.semestre1Form.get("niveau")?.valueChanges.subscribe(() => {
      this.filterMatieres(1)
    })

    this.semestre2Form.get("departement")?.valueChanges.subscribe((value) => {
      this.onDepartementChange(2, value)
    })

    this.semestre2Form.get("specialite")?.valueChanges.subscribe(() => {
      this.filterMatieres(2)
    })

    this.semestre2Form.get("niveau")?.valueChanges.subscribe(() => {
      this.filterMatieres(2)
    })
  }

  setActiveTab(tab: "semestre1" | "semestre2"): void {
    this.activeTab = tab
  }

  onDepartementChange(semestre: number, departementId: string): void {
    // Filtrer les spécialités en fonction du département sélectionné
    const filteredSpecialites = departementId
      ? this.specialites.filter((s) => s.department === departementId || s.departement === departementId)
      : this.specialites

    // Réinitialiser la spécialité si elle n'est plus valide
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const currentSpecialite = form.get("specialite")?.value

    if (currentSpecialite) {
      const isValid = filteredSpecialites.some((s) => s._id === currentSpecialite)
      if (!isValid) {
        form.get("specialite")?.setValue("")
      }
    }

    // Filtrer les matières
    this.filterMatieres(semestre)
  }

  filterMatieres(semestre: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const departement = form.get("departement")?.value
    const specialite = form.get("specialite")?.value
    const niveau = form.get("niveau")?.value

    let filtered = [...this.matieres]

    if (departement) {
      filtered = filtered.filter((m) => m.departement === departement)
    }

    if (specialite) {
      filtered = filtered.filter((m) => m.specialite === specialite)
    }

    if (niveau) {
      filtered = filtered.filter((m) => m.niveau === niveau)
    }

    // Filtrer par semestre
    filtered = filtered.filter((m) => {
      const cours = this.cours.find((c) => c._id === m.id)
      return cours && cours.semestre === semestre
    })

    if (semestre === 1) {
      this.filteredMatieresSemestre1 = filtered
    } else {
      this.filteredMatieresSemestre2 = filtered
    }
  }

  // Méthode pour gérer le changement de type de séance
  onTypeSeanceChange(event: Event, semestre: number, index: number): void {
    const selectElement = event.target as HTMLSelectElement
    if (selectElement) {
      const value = selectElement.value
      this.updateTypeSeance(semestre, index, value)
    }
  }

  // Méthode pour gérer le changement du nombre d'heures
  onHeuresChange(event: Event, semestre: number, index: number): void {
    const selectElement = event.target as HTMLSelectElement
    if (selectElement) {
      const value = Number.parseInt(selectElement.value, 10)
      this.updateHeures(semestre, index, value)
    }
  }

  // Méthode pour gérer le changement du nombre de filières
  onNbFilieresChange(event: Event, semestre: number, index: number): void {
    const selectElement = event.target as HTMLSelectElement
    if (selectElement) {
      const value = Number.parseInt(selectElement.value, 10)
      this.updateNbFilieres(semestre, index, value)
    }
  }

  // Méthode pour gérer le changement du nombre de groupes
  onNbGroupesChange(event: Event, semestre: number, index: number): void {
    const selectElement = event.target as HTMLSelectElement
    if (selectElement) {
      const value = Number.parseInt(selectElement.value, 10)
      this.updateNbGroupes(semestre, index, value)
    }
  }

  // Implémenter la méthode updateChargeHoraire
  updateChargeHoraire(): void {
    this.chargeHoraire = this.getChargeHoraireParGrade(this.grade)
    this.updateHeuresActuelles()
  }

  // Méthode pour obtenir la charge horaire selon le grade
  getChargeHoraireParGrade(grade: string): ChargeHoraire {
    // Valeurs hebdomadaires
    let chargeBase = 9.5 // Valeur de base: 9.5 heures par semaine
    let chargeSupplementaire = 4 // 4 heures supplémentaires par semaine
    let chargeTotal = 13.5 // Total: 13.5 heures par semaine - LIMITE STRICTE

    // On pourrait toujours avoir des règles différentes selon le grade
    switch (grade.toLowerCase()) {
      case "maitre assistant":
      case "maître assistant":
      case "maitre-assistant":
      case "maître-assistant":
        chargeBase = 9.5
        chargeSupplementaire = 4
        chargeTotal = 13.5 // Limite stricte pour Maitre Assistant
        break
      case "assistant":
        chargeBase = 11
        chargeSupplementaire = 4
        chargeTotal = 13.5 // Limite stricte à 13.5 pour tous les grades
        break
      case "pes":
      case "professeur":
        chargeBase = 7
        chargeSupplementaire = 2
        chargeTotal = 13.5 // Limite stricte à 13.5 pour tous les grades
        break
      default:
        chargeBase = 9.5
        chargeSupplementaire = 4
        chargeTotal = 13.5 // Valeur par défaut également à 13.5
    }

    // Convertir en heures par semestre (14 semaines)

    return {
      // Valeurs semestrielles (pour les calculs internes)
      base: chargeBase,
      supplementaire: chargeSupplementaire,
      total: chargeTotal,
      // Valeurs hebdomadaires (pour l'affichage)
      baseHebdo: chargeBase,
      supplementaireHebdo: chargeSupplementaire,
      totalHebdo: chargeTotal,
    }
  }

  // Implémenter la méthode updateHeures
  updateHeures(semestre: number, index: number, value: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    const matiereGroup = matieresArray.at(index) as FormGroup

    // Simuler le changement pour vérifier si cela dépasserait la limite
    const oldValue = matiereGroup.get("heures")?.value || 0

    // Créer une copie temporaire des heures actuelles
    const tempHeuresActuelles = { ...this.heuresActuelles }
    const typeSeance = matiereGroup.get("typeSeance")?.value
    const nbFilieres = matiereGroup.get("nbFilieres")?.value || 1
    const nbGroupes = matiereGroup.get("nbGroupes")?.value || 4

    // Calculer le nombre de séances pour l'ancienne et la nouvelle valeur
    const oldSeances = this.calculateNombreSeances(oldValue)
    const newSeances = this.calculateNombreSeances(value)

    // Soustraire les heures de l'ancienne valeur
    switch (typeSeance) {
      case "Cours":
        tempHeuresActuelles.cours -= oldSeances * nbFilieres * this.COEF_COURS_TD
        break
      case "TD":
        tempHeuresActuelles.td -= oldSeances * nbGroupes
        break
      case "TP":
        tempHeuresActuelles.tp -= oldSeances * nbGroupes * this.COEF_TP_TD
        break
    }

    // Ajouter les heures de la nouvelle valeur
    switch (typeSeance) {
      case "Cours":
        tempHeuresActuelles.cours += newSeances * nbFilieres * this.COEF_COURS_TD
        break
      case "TD":
        tempHeuresActuelles.td += newSeances * nbGroupes
        break
      case "TP":
        tempHeuresActuelles.tp += newSeances * nbGroupes * this.COEF_TP_TD
        break
    }

    // Calculer le nouveau total en équivalent TD
    const newTotalTD = tempHeuresActuelles.cours + tempHeuresActuelles.td + tempHeuresActuelles.tp

    // Calculer la charge hebdomadaire
    const newChargeHebdo = newTotalTD

    // Vérifier si le changement dépasserait la limite stricte de 13.5 heures
    if (newChargeHebdo > 13.5) {
      // Afficher le modal d'avertissement
      this.afficherModalChargeDepassee()
      return // Ne pas modifier les heures
    }

    // Si on arrive ici, on peut modifier les heures
    matiereGroup.get("heures")?.setValue(value)

    // Mettre à jour les heures actuelles
    this.updateHeuresActuelles()
  }

  // Implémenter la méthode updateTypeSeance
  updateTypeSeance(semestre: number, index: number, value: string): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    const matiereGroup = matieresArray.at(index) as FormGroup

    // Simuler le changement pour vérifier si cela dépasserait la limite
    const oldValue = matiereGroup.get("typeSeance")?.value

    // Créer une copie temporaire des heures actuelles
    const tempHeuresActuelles = { ...this.heuresActuelles }
    const heures = matiereGroup.get("heures")?.value || 1
    const nbFilieres = matiereGroup.get("nbFilieres")?.value || 1
    const nbGroupes = matiereGroup.get("nbGroupes")?.value || 4

    // Calculer le nombre de séances
    const nombreSeances = this.calculateNombreSeances(heures)

    // Soustraire les heures de l'ancien type
    if (oldValue === "Cours") {
      tempHeuresActuelles.cours -= nombreSeances * nbFilieres * this.COEF_COURS_TD
    } else if (oldValue === "TD") {
      tempHeuresActuelles.td -= nombreSeances * nbGroupes
    } else if (oldValue === "TP") {
      tempHeuresActuelles.tp -= nombreSeances * nbGroupes * this.COEF_TP_TD
    }

    // Ajouter les heures du nouveau type
    if (value === "Cours") {
      tempHeuresActuelles.cours += nombreSeances * nbFilieres * this.COEF_COURS_TD
    } else if (value === "TD") {
      tempHeuresActuelles.td += nombreSeances * nbGroupes
    } else if (value === "TP") {
      tempHeuresActuelles.tp += nombreSeances * nbGroupes * this.COEF_TP_TD
    }

    // Calculer le nouveau total en équivalent TD
    const newTotalTD = tempHeuresActuelles.cours + tempHeuresActuelles.td + tempHeuresActuelles.tp

    // Calculer la charge hebdomadaire
    const newChargeHebdo = newTotalTD

    // Vérifier si le changement dépasserait la limite stricte de 13.5 heures
    if (newChargeHebdo > 13.5) {
      // Afficher le modal d'avertissement
      this.afficherModalChargeDepassee()
      return // Ne pas modifier le type de séance
    }

    // Si on arrive ici, on peut modifier le type de séance
    matiereGroup.get("typeSeance")?.setValue(value)

    // Mettre à jour les heures actuelles
    this.updateHeuresActuelles()
  }

  // Implémenter la méthode updateNbFilieres
  updateNbFilieres(semestre: number, index: number, value: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    const matiereGroup = matieresArray.at(index) as FormGroup

    // Simuler le changement pour vérifier si cela dépasserait la limite
    const oldValue = matiereGroup.get("nbFilieres")?.value || 1

    // Créer une copie temporaire des heures actuelles
    const tempHeuresActuelles = { ...this.heuresActuelles }
    const heures = matiereGroup.get("heures")?.value || 1
    const typeSeance = matiereGroup.get("typeSeance")?.value

    // Calculer le nombre de séances
    const nombreSeances = this.calculateNombreSeances(heures)

    // Ne s'applique qu'aux cours
    if (typeSeance === "Cours") {
      // Soustraire les heures de l'ancienne valeur
      tempHeuresActuelles.cours -= nombreSeances * oldValue * this.COEF_COURS_TD

      // Ajouter les heures de la nouvelle valeur
      tempHeuresActuelles.cours += nombreSeances * value * this.COEF_COURS_TD

      // Calculer le nouveau total en équivalent TD
      const newTotalTD = tempHeuresActuelles.cours + tempHeuresActuelles.td + tempHeuresActuelles.tp

      // Calculer la charge hebdomadaire
      const newChargeHebdo = newTotalTD

      // Vérifier si le changement dépasserait la limite stricte de 13.5 heures
      if (newChargeHebdo > 13.5) {
        // Afficher le modal d'avertissement
        this.afficherModalChargeDepassee()
        return // Ne pas modifier le nombre de filières
      }
    }

    // Si on arrive ici, on peut modifier le nombre de filières
    matiereGroup.get("nbFilieres")?.setValue(value)

    // Mettre à jour les heures actuelles
    this.updateHeuresActuelles()
  }

  // Implémenter la méthode updateNbGroupes
  updateNbGroupes(semestre: number, index: number, value: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    const matiereGroup = matieresArray.at(index) as FormGroup

    // Simuler le changement pour vérifier si cela dépasserait la limite
    const oldValue = matiereGroup.get("nbGroupes")?.value || 4

    // Créer une copie temporaire des heures actuelles
    const tempHeuresActuelles = { ...this.heuresActuelles }
    const heures = matiereGroup.get("heures")?.value || 1
    const typeSeance = matiereGroup.get("typeSeance")?.value

    // Calculer le nombre de séances
    const nombreSeances = this.calculateNombreSeances(heures)

    // Ne s'applique qu'aux TD et TP
    if (typeSeance === "TD" || typeSeance === "TP") {
      // Soustraire les heures de l'ancienne valeur
      if (typeSeance === "TD") {
        tempHeuresActuelles.td -= nombreSeances * oldValue
      } else {
        tempHeuresActuelles.tp -= nombreSeances * oldValue * this.COEF_TP_TD
      }

      // Ajouter les heures de la nouvelle valeur
      if (typeSeance === "TD") {
        tempHeuresActuelles.td += nombreSeances * value
      } else {
        tempHeuresActuelles.tp += nombreSeances * value * this.COEF_TP_TD
      }

      // Calculer le nouveau total en équivalent TD
      const newTotalTD = tempHeuresActuelles.cours + tempHeuresActuelles.td + tempHeuresActuelles.tp

      // Calculer la charge hebdomadaire
      const newChargeHebdo = newTotalTD

      // Vérifier si le changement dépasserait la limite stricte de 13.5 heures
      if (newChargeHebdo > 13.5) {
        // Afficher le modal d'avertissement
        this.afficherModalChargeDepassee()
        return // Ne pas modifier le nombre de groupes
      }
    }

    // Si on arrive ici, on peut modifier le nombre de groupes
    matiereGroup.get("nbGroupes")?.setValue(value)

    // Mettre à jour les heures actuelles
    this.updateHeuresActuelles()
  }

  // Implémenter la méthode updateHeuresActuelles
  updateHeuresActuelles(): void {
    // Réinitialiser les compteurs
    this.heuresActuelles = {
      cours: 0,
      td: 0,
      tp: 0,
      cours_filiere: 0,
      td_groupe: 0,
      tp_groupe: 0,
    }

    // Récupérer toutes les matières sélectionnées des deux semestres
    const matieresS1 = this.getMatieresControls(1)
    const matieresS2 = this.getMatieresControls(2)
    const allMatieres = [...matieresS1, ...matieresS2]

    // Pour chaque matière, calculer les heures selon le type de séance
    allMatieres.forEach((matiereControl) => {
      const matiereId = matiereControl.get("id")?.value
      const heures = matiereControl.get("heures")?.value || 0
      const typeSeance = matiereControl.get("typeSeance")?.value
      const nbFilieres = matiereControl.get("nbFilieres")?.value || 1
      const nbGroupes = matiereControl.get("nbGroupes")?.value || 4

      // Calculer le nombre de séances
      const nombreSeances = this.calculateNombreSeances(heures)

      // Calculer les heures selon le type de séance
      if (typeSeance === "Cours") {
        // Nouveau calcul pour les cours: nombre de séances × nombre de filières × 1.83
        this.heuresActuelles.cours += nombreSeances * nbFilieres * this.COEF_COURS_TD
        this.heuresActuelles.cours_filiere = nbFilieres // Stocker le nombre de filières
      } else if (typeSeance === "TD") {
        // Nouveau calcul pour les TD: nombre de séances × nombre de groupes
        this.heuresActuelles.td += nombreSeances * nbGroupes
        this.heuresActuelles.td_groupe = nbGroupes // Stocker le nombre de groupes
      } else if (typeSeance === "TP") {
        // Nouveau calcul pour les TP: nombre de séances × nombre de groupes × 0.86
        this.heuresActuelles.tp += nombreSeances * nbGroupes * this.COEF_TP_TD
        this.heuresActuelles.tp_groupe = nbGroupes // Stocker le nombre de groupes
      }
    })

    // Calculer les conversions avec les coefficients
    this.conversionHeures = {
      // Pour les cours: déjà calculé avec le coefficient
      coursTD: Number.parseFloat(this.heuresActuelles.cours.toFixed(2)),
      // Pour les TP: déjà calculé avec le coefficient
      tpTD: Number.parseFloat(this.heuresActuelles.tp.toFixed(2)),
      // Total en équivalent TD
      totalTD: Number.parseFloat(
        (this.heuresActuelles.cours + this.heuresActuelles.td + this.heuresActuelles.tp).toFixed(2),
      ),
    }

    // Vérifier si la charge horaire dépasse la limite
    this.checkChargeHoraireLimit()
  }

  // Implémenter la méthode getMatieresControls
  getMatieresControls(semestre: number): FormGroup[] {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    return (form.get("matieres") as FormArray).controls as FormGroup[]
  }

  // Ajouter cette nouvelle méthode pour calculer la charge horaire hebdomadaire
  getChargeHoraireHebdomadaire(): number {
    // Diviser la charge totale par le nombre de semaines (14)
    return Number.parseFloat(this.conversionHeures.totalTD.toFixed(2))
  }

  // Calculer le pourcentage de charge horaire utilisée
  getChargeHorairePourcentage(): number {
    if (this.chargeHoraire.totalHebdo === 0) return 0
    const pourcentage = (this.getChargeHoraireHebdomadaire() / this.chargeHoraire.totalHebdo) * 100
    return Math.min(100, Number.parseFloat(pourcentage.toFixed(1)))
  }

  // Obtenir la classe CSS pour la barre de progression
  getProgressBarClass(): string {
    const pourcentage = this.getChargeHorairePourcentage()
    if (pourcentage > 95) return "danger" // Dépassement ou presque
    if (pourcentage >= 85) return "warning" // Proche de la limite (85% ou plus)
    if (pourcentage >= 70) return "caution" // Attention (70% ou plus)
    return "success" // En dessous de 70% de la limite
  }

  // Nouvelle méthode pour vérifier si la charge horaire dépasse la limite
  checkChargeHoraireLimit(): void {
    if (this.isChargeHoraireDepassee()) {
      // Afficher un message d'avertissement
      this.afficherModalChargeDepassee()
    }
  }

  // Vérifier si la charge horaire est dépassée
  isChargeHoraireDepassee(): boolean {
    return this.getChargeHoraireHebdomadaire() > 13.5
  }

  // Cacher le modal actif
  hideModal(): void {
    this.activeModal = null
  }

  // Implémenter la méthode afficherModalChargeDepassee
  afficherModalChargeDepassee(): void {
    this.activeModal = "chargeDepassee"

    // Créer un élément de notification si nécessaire
    const existingNotification = this.notifications.find((n) => n.id === 999)
    if (!existingNotification) {
      this.notifications.unshift({
        id: 999,
        sender: "Système",
        avatar: "⚠️",
        message: `Attention: Votre charge horaire (${this.getChargeHoraireHebdomadaire()} heures) dépasse la limite stricte de 13.5 heures hebdomadaires.`,
        time: "À l'instant",
        read: false,
      })
      this.updateUnreadCount()
    }
  }

  // Modifier la méthode toggleMatiere pour utiliser la nouvelle méthode afficherModalChargeDepassee
  toggleMatiere(semestre: number, matiere: Matiere): boolean {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray

    // Vérifier si la matière est déjà sélectionnée
    const index = matieresArray.controls.findIndex((control) => control.get("id")?.value === matiere.id)

    if (index >= 0) {
      // Si la matière est déjà sélectionnée, la supprimer
      matieresArray.removeAt(index)
      // Mettre à jour les heures actuelles après chaque modification
      this.updateHeuresActuelles()
      return false
    } else {
      // Simuler l'ajout pour vérifier si cela dépasserait la limite
      const defaultFiliere = this.filieresOptions.length > 0 ? this.filieresOptions[0] : 1
      const defaultGroupe = this.groupesOptions.length > 0 ? this.groupesOptions[0] : 4

      // Récupérer les heures du cours depuis le service
      const heures = this.getHeuresByCourId(matiere.id)

      // Calculer le nombre de séances
      const nombreSeances = this.calculateNombreSeances(heures)

      // Créer une copie temporaire des heures actuelles
      const tempHeuresActuelles = { ...this.heuresActuelles }
      const typeSeance = "Cours" // Type par défaut

      // Simuler l'ajout selon le type de séance
      if (typeSeance === "Cours") {
        tempHeuresActuelles.cours += nombreSeances * defaultFiliere * this.COEF_COURS_TD
      } else if (typeSeance === "TD") {
        tempHeuresActuelles.td += nombreSeances * defaultGroupe
      } else if (typeSeance === "TP") {
        tempHeuresActuelles.tp += nombreSeances * defaultGroupe * this.COEF_TP_TD
      }

      // Calculer le nouveau total en équivalent TD
      const newTotalTD = tempHeuresActuelles.cours + tempHeuresActuelles.td + tempHeuresActuelles.tp

      // Calculer la charge hebdomadaire
      const newChargeHebdo = newTotalTD

      // Vérifier si l'ajout dépasserait la limite stricte de 13.5 heures
      if (newChargeHebdo > 13.5) {
        // Afficher le modal d'avertissement
        this.afficherModalChargeDepassee()
        return false // Ne pas ajouter la matière
      }

      // Si on arrive ici, on peut ajouter la matière
      matieresArray.push(
        this.fb.group({
          id: [matiere.id],
          nom: [matiere.nom],
          heures: [this.getHeuresByCourId(matiere.id)], // Utiliser les heures du cours depuis la base de données
          commentaire: [""],
          typeSeance: ["Cours"], // Valeur par défaut pour le type de séance
          nbFilieres: [defaultFiliere], // Nombre de filières pour les cours depuis le service
          nbGroupes: [defaultGroupe], // Nombre de groupes pour les TD/TP depuis le service
        }),
      )

      // Désactiver la modification des heures
      this.disableHeuresModification()

      // Mettre à jour les heures actuelles après chaque modification
      this.updateHeuresActuelles()
      return true
    }
  }

  // Méthode pour empêcher la modification des heures
  disableHeuresModification(): void {
    // Pour le semestre 1
    const matieresS1 = this.getMatieresControls(1)
    matieresS1.forEach((matiere) => {
      matiere.get("heures")?.disable()
    })

    // Pour le semestre 2
    const matieresS2 = this.getMatieresControls(2)
    matieresS2.forEach((matiere) => {
      matiere.get("heures")?.disable()
    })
  }

  // Vérifier si une matière est sélectionnée
  isSelected(semestre: number, matiereId: string): boolean {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    return matieresArray.controls.some((control) => control.get("id")?.value === matiereId)
  }

  // Vérifier si une matière est indisponible (déjà attribuée)
  isUnavailable(matiereId: string): boolean {
    return this.unavailableMatieres.includes(matiereId)
  }

  // Méthode pour calculer le total des heures
  getTotalHeures(semestre: number): number {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    return matieresArray.controls.reduce((total, control) => total + (control.get("heures")?.value || 0), 0)
  }

  // Méthodes pour gérer la priorité des matières
  moveUp(semestre: number, index: number): void {
    if (index <= 0) return

    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray

    // Échanger avec l'élément précédent
    const temp = matieresArray.at(index - 1).value
    matieresArray.at(index - 1).patchValue(matieresArray.at(index).value)
    matieresArray.at(index).patchValue(temp)
  }

  moveDown(semestre: number, index: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray

    if (index >= matieresArray.length - 1) return

    // Échanger avec l'élément suivant
    const temp = matieresArray.at(index + 1).value
    matieresArray.at(index + 1).patchValue(matieresArray.at(index).value)
    matieresArray.at(index).patchValue(temp)
  }

  // Méthode pour réinitialiser le formulaire
  resetForm(semestre: number): void {
    if (semestre === 1) {
      this.semestre1Form.get("departement")?.setValue("")
      this.semestre1Form.get("specialite")?.setValue("")
      this.semestre1Form.get("niveau")?.setValue("")
      ;(this.semestre1Form.get("matieres") as FormArray).clear()
      this.semestre1Submitted = false
    } else {
      this.semestre2Form.get("departement")?.setValue("")
      this.semestre2Form.get("specialite")?.setValue("")
      this.semestre2Form.get("niveau")?.setValue("")
      ;(this.semestre2Form.get("matieres") as FormArray).clear()
      this.semestre2Submitted = false
    }

    // Mettre à jour les heures actuelles après réinitialisation
    this.updateHeuresActuelles()
  }

  // Méthode pour soumettre les voeux
  submitVoeux(semestre: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form

    if ((form.get("matieres") as FormArray).length > 0) {
      // Dans la méthode submitVoeux, modifier la préparation des données pour s'assurer que les types de séance sont en minuscules
      // Remplacer la section de préparation des données par:

      // Préparer les données pour l'API
      const matieresArray = form.get("matieres") as FormArray
      const matiereIds = matieresArray.controls.map((control) => control.get("id")?.value)
      const typesSeance = matieresArray.controls.map((control) => {
        // Convertir en minuscules pour correspondre au schéma backend
        const type = control.get("typeSeance")?.value
        return type ? type.toLowerCase() : "cours"
      })
      const nbFilieres = matieresArray.controls.map((control) => control.get("nbFilieres")?.value)
      const nbGroupes = matieresArray.controls.map((control) => control.get("nbGroupes")?.value)
      const heures = matieresArray.controls.map((control) => control.get("heures")?.value)

      // Créer l'objet de données complet pour le voeu
      const voeuxData = {
        enseignantId: "67c4c2f07fe25e5361a1e1bf", // ID de l'enseignant connecté
        enseignantNom: this.enseignantName,
        departement: form.get("departement")?.value || this.departement,
        specialite: form.get("specialite")?.value || this.specialite,
        niveau: form.get("niveau")?.value || "Licence", // Valeur par défaut pour éviter les champs vides
        semestre: semestre.toString(),
        matieres: matiereIds,
        typesSeance: typesSeance,
        nbFilieres: nbFilieres,
        nbGroupes: nbGroupes,
        heures: heures, // Ajout des heures pour chaque matière
        commentaire: "",
        status: "pending",
        // Structure de charge horaire complète
        chargeHoraire: {
          cours: this.heuresActuelles.cours,
          td: this.heuresActuelles.td,
          tp: this.heuresActuelles.tp,
          coursTD: this.conversionHeures.coursTD,
          tpTD: this.conversionHeures.tpTD,
          totalTD: this.conversionHeures.totalTD,
        },
      }

      // Afficher les données dans la console pour débogage
      console.log("Données du voeu à envoyer:", voeuxData)

      // Envoyer les données à l'API
      this.subscriptions.push(
        this.voeuxService.createVoeux(voeuxData).subscribe({
          next: (response) => {
            console.log(`Voeux pour le semestre ${semestre} soumis avec succès:`, response)

            // Marquer comme soumis
            if (semestre === 1) {
              this.semestre1Submitted = true
            } else {
              this.semestre2Submitted = true
            }

            // Ajouter une notification de confirmation
            this.notifications.unshift({
              id: Date.now(),
              sender: "Système",
              avatar: "✅",
              message: `Vos voeux pour le semestre ${semestre} ont été soumis avec succès.`,
              time: "À l'instant",
              read: false,
            })
            this.updateUnreadCount()

            // Mettre à jour les heures actuelles
            this.updateHeuresActuelles()
          },
          error: (error) => {
            console.error(`Erreur lors de la soumission des voeux pour le semestre ${semestre}:`, error)

            // Ajouter une notification d'erreur avec plus de détails
            this.notifications.unshift({
              id: Date.now(),
              sender: "Système",
              avatar: "❌",
              message: `Erreur lors de la soumission des voeux pour le semestre ${semestre}: ${error.message || "Veuillez vérifier les données et réessayer."}`,
              time: "À l'instant",
              read: false,
            })
            this.updateUnreadCount()
          },
        }),
      )
    } else {
      // Afficher un message d'erreur
      this.notifications.unshift({
        id: Date.now(),
        sender: "Système",
        avatar: "⚠️",
        message: "Veuillez sélectionner au moins une matière avant de soumettre vos voeux.",
        time: "À l'instant",
        read: false,
      })
      this.updateUnreadCount()
    }
  }

  // Méthodes pour obtenir les noms à partir des IDs
  getDepartementName(id: string): string {
    const dept = this.departements.find((d) => d._id === id || d.id === id)
    return dept ? dept.name || dept.nom : ""
  }

  getSpecialiteName(id: string): string {
    const specialite = this.specialites.find((s) => s._id === id || s.id === id)
    return specialite ? specialite.name || specialite.nom : ""
  }

  getNiveauName(id: string): string {
    const niveau = this.niveaux.find((n) => n._id === id || n.id === id)
    return niveau ? niveau.name || niveau.nom : ""
  }

  // Méthode pour supprimer une matière
  removeMatiere(semestre: number, index: number): void {
    const form = semestre === 1 ? this.semestre1Form : this.semestre2Form
    const matieresArray = form.get("matieres") as FormArray
    matieresArray.removeAt(index)

    // Mettre à jour les heures actuelles
    this.updateHeuresActuelles()
  }

  // Modifier la méthode calculateNombreSeances pour qu'elle calcule correctement le nombre de séances
  // en fonction des heures (21h = 1 séance, 42h = 2 séances, etc.)
  calculateNombreSeances(heures: number): number {
    if (!heures) return 0
    // Division entière par 21 pour obtenir le nombre de séances
    return Math.floor(heures / this.HEURES_PAR_SEANCE)
  }

  // Ajouter cette méthode pour obtenir le nom de la matière à partir de son ID
  getMatiereNameById(matiereId: string): string {
    const cours = this.cours.find((c) => c._id === matiereId)
    return cours ? cours.titre : "Non spécifié"
  }
}
