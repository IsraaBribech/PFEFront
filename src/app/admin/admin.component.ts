import { Component, type OnInit } from "@angular/core"
import {  FormBuilder, type FormGroup, Validators } from "@angular/forms"
import  { UserService } from "../user.service"
import { MatSnackBar } from "@angular/material/snack-bar"
import  { SpecialitesService } from "../specialites.service"
import  { DepartementsService } from "../departements.service"
import  { StatsService, UserDistribution, DeptSpecialty } from "../stats.service"
import  { NiveauxService } from "../niveaux.service"
import  { EnseignantService } from "../enseignant.service"
import  { GroupeService, Filiere, Groupe } from "../groupe.service" // Importation du GroupeService
import { forkJoin } from "rxjs"

// Define interfaces for our data types
interface Specialty {
  _id: string
  id?: string
  name: string
  description?: string
  department: string
  level: string | { _id: string }
  [key: string]: any // For any other properties
}

interface Department {
  _id: string
  name: string
  description?: string
  [key: string]: any
}

interface Level {
  _id: string
  name: string
  description?: string
  [key: string]: any
}

interface Enseignant {
  birthDate: any
  civilStatus: any
  id: number
  name: string
  cin: string
  email: string
  departement: string
  telephone?: string
  couleur?: string
  grade?: string
}

interface Stats {
  users: any
  specialties: any
  departments: any
}

@Component({
  selector: "app-admin",
  templateUrl: "./admin.component.html",
  styleUrls: ["./admin.component.css"],
})
export class AdminComponent implements OnInit {
  activeModal: string | null = null

  // Déclaration des formulaires
  userForm!: FormGroup
  levelForm!: FormGroup
  specialtyForm!: FormGroup
  regimeForm!: FormGroup
  departmentForm!: FormGroup
  enseignantForm!: FormGroup

  // Données pour les sélecteurs
  departments: Department[] = []
  specialties: Specialty[] = []
  niveaux: Level[] = []
  filteredSpecialties: Specialty[] = []

  // Nouvelles propriétés pour les filières et groupes
  filieres: Filiere[] = []
  filteredFilieres: Filiere[] = []
  selectedFiliere: Filiere | null = null
  availableGroupes: Groupe[] = []
  // Suppression de la propriété availableSubGroups

  // Variables pour stocker les valeurs sélectionnées
  selectedDepartment = ""
  selectedLevel = ""
  selectedSpecialty = ""

  // Statistiques
  userStats: any = { total: 0, growth: 0, chart: 0 }
  levelStats: any = { total: 0, growth: 0, chart: 0 }
  specialtyStats: any = { total: 0, growth: 0, chart: 0 }
  departmentStats: any = { total: 0, growth: 0, chart: 0 }

  // Données graphiques
  userDistribution: UserDistribution[] = []
  deptSpecialties: DeptSpecialty[] = []

  // Propriétés pour la gestion des enseignants
  enseignants: Enseignant[] = []
  filteredEnseignants: Enseignant[] = []
  selectedEnseignant: Enseignant | null = null
  editMode = false
  showPassword = false

  // Ajouter cette propriété avec les autres propriétés de classe
  isEditing = false

  // Indicateurs de chargement
  loadingEnseignants = false
  loadingNiveaux = false
  loadingSpecialites = false
  loadingDepartments = false
  loadingFilieres = false
  submitting = false

  constructor(
    private fb: FormBuilder,
    private specialitesService: SpecialitesService,
    private departementsService: DepartementsService,
    private userService: UserService,
    private statsService: StatsService,
    private snackBar: MatSnackBar,
    private niveauService: NiveauxService,
    private enseignantService: EnseignantService,
    private groupeService: GroupeService, // Injection du GroupeService
  ) {}

  ngOnInit(): void {
    this.initForms()
    this.loadStatistics()
    this.loadInitialData()

    // Écouteurs pour les changements de département et niveau dans les formulaires
    this.userForm.get("department")?.valueChanges.subscribe((departmentId) => {
      this.onDepartmentChangedInForm("user", departmentId)
      this.filterFilieres() // Filtrer les filières quand le département change
    })

    this.userForm.get("level")?.valueChanges.subscribe((levelId) => {
      this.onLevelChangedInForm("user", levelId)
      this.filterFilieres() // Filtrer les filières quand le niveau change
    })

    this.userForm.get("specialty")?.valueChanges.subscribe((specialtyId) => {
      this.filterFilieres() // Filtrer les filières quand la spécialité change
    })

    // Nouvel écouteur pour le changement de filière
    this.userForm.get("filiere")?.valueChanges.subscribe((filiereId) => {
      this.onFiliereChange(filiereId)
    })

    // Nouvel écouteur pour le changement de groupe - Simplifié sans sous-groupe
    this.userForm.get("group")?.valueChanges.subscribe((groupId) => {
      // Pas besoin de gérer les sous-groupes
      console.log("Groupe sélectionné:", groupId)
    })

    this.enseignantForm.get("department")?.valueChanges.subscribe((departmentId) => {
      this.onDepartmentChangedInForm("enseignant", departmentId)
    })

    this.enseignantForm.get("level")?.valueChanges.subscribe((levelId) => {
      this.onLevelChangedInForm("enseignant", levelId)
    })

    this.specialtyForm.get("department")?.valueChanges.subscribe((departmentId) => {
      console.log("Département sélectionné pour nouvelle spécialité:", departmentId)
    })

    // Ajout des écouteurs pour firstName et lastName pour mettre à jour le nom complet
    this.enseignantForm.get("firstName")?.valueChanges.subscribe(() => {
      this.updateFullName()
    })

    this.enseignantForm.get("lastName")?.valueChanges.subscribe(() => {
      this.updateFullName()
    })
  }

  // Méthodes pour la validation des formulaires
  hasError(controlName: string, formName: string): boolean {
    const form =
      formName === "userForm"
        ? this.userForm
        : formName === "enseignantForm"
          ? this.enseignantForm
          : formName === "levelForm"
            ? this.levelForm
            : formName === "specialtyForm"
              ? this.specialtyForm
              : formName === "departmentForm"
                ? this.departmentForm
                : this.regimeForm

    const control = form.get(controlName)
    return control ? control.invalid && (control.dirty || control.touched) : false
  }

  getErrorMessage(controlName: string, formName: string): string {
    const form =
      formName === "userForm"
        ? this.userForm
        : formName === "enseignantForm"
          ? this.enseignantForm
          : formName === "levelForm"
            ? this.levelForm
            : formName === "specialtyForm"
              ? this.specialtyForm
              : formName === "departmentForm"
                ? this.departmentForm
                : this.regimeForm

    const control = form.get(controlName)

    if (!control) return ""

    if (control.hasError("required")) {
      return "Ce champ est requis"
    }

    if (control.hasError("email")) {
      return "Veuillez entrer une adresse email valide"
    }

    if (control.hasError("minlength")) {
      const requiredLength = control.getError("minlength").requiredLength
      return `Ce champ doit contenir au moins ${requiredLength} caractères`
    }

    if (control.hasError("pattern")) {
      if (controlName === "cin" || controlName === "telephone") {
        return "Veuillez entrer 8 chiffres"
      }
      return "Format invalide"
    }

    return "Champ invalide"
  }

  // Nouvelle méthode pour charger les filières
  loadFilieres(): void {
    this.loadingFilieres = true
    this.groupeService.getGroupes().subscribe({
      next: (data: Filiere[]) => {
        console.log("Filières chargées:", data)
        this.filieres = data
        this.filteredFilieres = [...data]
        this.loadingFilieres = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des filières:", error)
        this.showNotification("Erreur lors du chargement des filières", true)
        this.loadingFilieres = false
      },
    })
  }

  // Nouvelle méthode pour filtrer les filières selon le département, niveau et spécialité
  filterFilieres(): void {
    const departmentId = this.userForm.get("department")?.value
    const levelId = this.userForm.get("level")?.value
    const specialtyId = this.userForm.get("specialty")?.value

    // Réinitialiser la filière et le groupe sélectionnés
    this.userForm.get("filiere")?.setValue("")
    this.userForm.get("group")?.setValue("")
    // Suppression de la réinitialisation du sous-groupe

    this.availableGroupes = []
    // Suppression de la réinitialisation des sous-groupes

    if (!this.filieres.length) {
      return
    }

    this.filteredFilieres = this.filieres.filter((filiere) => {
      const matchesDepartment = !departmentId || filiere.departement === departmentId
      const matchesLevel = !levelId || filiere.niveau === levelId
      const matchesSpecialty = !specialtyId || filiere.specialite === specialtyId

      return matchesDepartment && matchesLevel && matchesSpecialty
    })

    console.log("Filières filtrées:", this.filteredFilieres)
  }

  // Nouvelle méthode pour gérer le changement de filière
  onFiliereChange(filiereId: string): void {
    this.userForm.get("group")?.setValue("")
    // Suppression de la réinitialisation du sous-groupe

    if (!filiereId) {
      this.availableGroupes = []
      return
    }

    const selectedFiliere = this.filteredFilieres.find((f) => f._id === filiereId)
    if (selectedFiliere) {
      this.selectedFiliere = selectedFiliere
      this.availableGroupes = selectedFiliere.groupes
      console.log("Groupes disponibles:", this.availableGroupes)
    } else {
      this.selectedFiliere = null
      this.availableGroupes = []
    }
  }

  // Méthode modifiée pour gérer le changement de groupe - Supprimée car plus besoin de gérer les sous-groupes

  // Nouvelle méthode pour mettre à jour le nom complet
  private updateFullName(): void {
    const firstName = this.enseignantForm.get("firstName")?.value || ""
    const lastName = this.enseignantForm.get("lastName")?.value || ""
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim()
      this.enseignantForm.get("name")?.setValue(fullName)
    }
  }

  onDepartmentChangedInForm(formType: string, departmentId: string): void {
    console.log(`Département modifié dans le formulaire ${formType}:`, departmentId)

    const form = formType === "user" ? this.userForm : this.enseignantForm
    const levelId = form.get("level")?.value

    // Réinitialiser la spécialité
    form.get(formType === "user" ? "specialty" : "specialite")?.setValue("")

    if (departmentId && levelId) {
      this.loadSpecialtiesByDepartmentAndLevel(departmentId, levelId)
    } else if (departmentId) {
      this.loadSpecialtiesForDepartment(departmentId)
    } else {
      this.filteredSpecialties = []
    }
  }

  onLevelChangedInForm(formType: string, levelId: string): void {
    console.log(`Niveau modifié dans le formulaire ${formType}:`, levelId)

    const form = formType === "user" ? this.userForm : this.enseignantForm
    const departmentId = form.get("department")?.value

    // Réinitialiser la spécialité
    form.get(formType === "user" ? "specialty" : "specialite")?.setValue("")

    if (departmentId && levelId) {
      this.loadSpecialtiesByDepartmentAndLevel(departmentId, levelId)
    }
  }

  // Charger toutes les données initiales
  loadInitialData(): void {
    this.loadingEnseignants = true
    this.loadingNiveaux = true
    this.loadingDepartments = true
    this.loadingSpecialites = true
    this.loadingFilieres = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      niveaux: this.niveauService.getNiveaux(),
      departments: this.departementsService.getDepartements(),
      specialties: this.specialitesService.getSpecialites(),
      filieres: this.groupeService.getGroupes(), // Ajout du chargement des filières
    }).subscribe({
      next: (results) => {
        // Traiter les résultats
        this.niveaux = results.niveaux
        this.departments = results.departments
        this.specialties = results.specialties
        this.filieres = results.filieres
        this.filteredFilieres = [...results.filieres]

        // Initialiser la liste filtrée des enseignants
        this.filteredEnseignants = [...this.enseignants]

        // Mettre à jour les indicateurs de chargement
        this.loadingEnseignants = false
        this.loadingNiveaux = false
        this.loadingDepartments = false
        this.loadingSpecialites = false
        this.loadingFilieres = false
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des données initiales:", error)
        this.showNotification("Erreur lors du chargement des données. Veuillez réessayer.", true)

        // Mettre à jour les indicateurs de chargement même en cas d'erreur
        this.loadingEnseignants = false
        this.loadingNiveaux = false
        this.loadingDepartments = false
        this.loadingSpecialites = false
        this.loadingFilieres = false
      },
    })
  }

  debugForm() {
    console.log("État du formulaire:", {
      valide: this.userForm.valid,
      valeur: this.userForm.value,
      erreurs: this.userForm.errors,
      contrôles: Object.keys(this.userForm.controls).map((key) => ({
        nom: key,
        valide: this.userForm.get(key)?.valid,
        erreurs: this.userForm.get(key)?.errors,
      })),
    })

    alert(`Le formulaire est ${this.userForm.valid ? "valide" : "invalide"}. Voir console pour détails.`)
  }

  // Méthode pour filtrer les spécialités en fonction du département ET du niveau
  filterSpecialties(): void {
    const departmentId =
      this.activeModal === "user"
        ? this.userForm.get("department")?.value
        : this.enseignantForm.get("department")?.value

    const levelId =
      this.activeModal === "user" ? this.userForm.get("level")?.value : this.enseignantForm.get("level")?.value

    if (departmentId && levelId) {
      this.loadSpecialtiesByDepartmentAndLevel(departmentId, levelId)
    } else if (departmentId) {
      this.loadSpecialtiesForDepartment(departmentId)
    } else {
      this.filteredSpecialties = []
    }
  }

  // Méthode pour filtrer les spécialités en fonction du département sélectionné
  filterSpecialtiesByDepartment(departmentId: any): void {
    console.log("Département sélectionné:", departmentId, "Type:", typeof departmentId)
    console.log("Toutes les spécialités disponibles:", this.specialties)

    if (!departmentId) {
      // Si aucun département n'est sélectionné, afficher toutes les spécialités
      this.filteredSpecialties = [...this.specialties]
      return
    }

    // Filtrer les spécialités qui appartiennent au département sélectionné
    // Utilisation de la conversion en String pour garantir une comparaison correcte
    this.filteredSpecialties = this.specialties.filter((specialite) => {
      // Vérifier si specialite.departmentId existe
      if (!specialite["departmentId"] && !specialite["department_id"] && !specialite.department) {
        console.warn("Spécialité sans departmentId:", specialite)
        return false
      }

      // Essayer de trouver l'ID du département dans différentes propriétés possibles
      const specDeptId = specialite["departmentId"] || specialite["department_id"] || specialite["department"]

      // Comparer les chaînes de caractères
      const result = String(specDeptId) === String(departmentId)
      console.log(
        `Comparaison: ${specDeptId} (${typeof specDeptId}) === ${departmentId} (${typeof departmentId}) = ${result}`,
      )
      return result
    })

    console.log("Spécialités filtrées par département:", this.filteredSpecialties)

    // Si la filtration ne donne aucun résultat, vérifier la structure des données
    if (this.filteredSpecialties.length === 0) {
      console.warn("Aucune spécialité trouvée pour le département", departmentId)
      console.log(
        "Structure détaillée des spécialités:",
        this.specialties.map((s) => ({
          id: s.id,
          name: s.name,
          departmentId: s["departmentId"],
          department_id: s["department_id"],
          department: s.department,
          // Afficher toutes les propriétés pour voir la structure complète
          allProps: Object.keys(s),
        })),
      )
    }

    // Si la spécialité actuellement sélectionnée n'est pas dans la liste filtrée, la réinitialiser
    const currentSpecialiteId = this.enseignantForm.get("specialite")?.value
    if (currentSpecialiteId) {
      const specialtyExists = this.filteredSpecialties.some((spec) => String(spec.id) === String(currentSpecialiteId))

      if (!specialtyExists) {
        this.enseignantForm.get("specialite")?.setValue("")
      }
    }
  }

  loadNiveaux(): void {
    this.niveauService.getNiveaux().subscribe({
      next: (niveaux: Level[]) => {
        console.log("Niveaux chargés:", niveaux)
        this.niveaux = niveaux
        this.levelStats.total = niveaux.length
        this.levelStats.growth = (niveaux.length / 100) * 5
        this.levelStats.chart = (niveaux.length * 100) / 20
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des niveaux:", error)
        this.showNotification("Erreur lors du chargement des niveaux", true)
      },
    })
  }

  loadDepartments(): void {
    this.departementsService.getDepartements().subscribe({
      next: (data: Department[]) => {
        console.log("Départements chargés:", data)
        this.departments = data
      },
      error: (error) => {
        console.error("Erreur lors du chargement des départements:", error)
        this.showNotification("Erreur lors du chargement des départements", true)
      },
    })
  }

  loadSpecialties(): void {
    this.specialitesService.getSpecialites().subscribe({
      next: (data: Specialty[]) => {
        console.log("Spécialités chargées:", data)
        this.specialties = data

        // Afficher la structure d'une spécialité pour déboguer
        if (data && data.length > 0) {
          console.log("Structure d'une spécialité:", JSON.stringify(data[0], null, 2))
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des spécialités:", error)
        this.showNotification("Erreur lors du chargement des spécialités", true)
      },
    })
  }

  // Méthode améliorée pour charger les spécialités d'un département spécifique
  loadSpecialtiesForDepartment(departmentId: string): void {
    console.log("Chargement des spécialités pour le département:", departmentId)

    if (!departmentId) {
      this.filteredSpecialties = []
      return
    }

    this.specialitesService.getSpecialitesByDepartement(departmentId).subscribe({
      next: (data: Specialty[]) => {
        console.log(`Spécialités du département ${departmentId}:`, data)
        this.filteredSpecialties = data

        // Si aucune spécialité n'est trouvée, informer l'utilisateur
        if (data.length === 0) {
          this.showNotification(`Aucune spécialité trouvée pour ce département`, false)
        }

        // Si le département a changé, réinitialiser la valeur de spécialité dans le formulaire en fonction du formulaire actif
        if (this.activeModal === "user") {
          const currentSpecialty = this.userForm.get("specialty")?.value
          if (currentSpecialty) {
            const exists = this.filteredSpecialties.some((s) => s._id === currentSpecialty || s.id === currentSpecialty)

            if (!exists) {
              this.userForm.get("specialty")?.setValue("")
            }
          }
        } else if (this.activeModal === "enseignant") {
          const currentSpecialite = this.enseignantForm.get("specialite")?.value
          if (currentSpecialite) {
            const exists = this.filteredSpecialties.some(
              (s) => s._id === currentSpecialite || s.id === currentSpecialite,
            )

            if (!exists) {
              this.enseignantForm.get("specialite")?.setValue("")
            }
          }
        }
      },
      error: (error) => {
        console.error(`Erreur lors du chargement des spécialités pour le département ${departmentId}:`, error)
        this.showNotification("Erreur lors du chargement des spécialités", true)
        this.filteredSpecialties = []
      },
    })
  }

  // Nouvelle méthode pour charger les spécialités par département ET niveau
  loadSpecialtiesByDepartmentAndLevel(departmentId: string, levelId: string): void {
    console.log(`Chargement des spécialités - Département: ${departmentId}, Niveau: ${levelId}`)

    if (!departmentId || !levelId) {
      return
    }

    // Afficher les types des IDs pour le débogage
    console.log("Types des IDs:", {
      departmentIdType: typeof departmentId,
      departmentIdValue: departmentId,
      levelIdType: typeof levelId,
      levelIdValue: levelId,
    })

    // D'abord, chargeons toutes les spécialités du département
    this.specialitesService.getSpecialitesByDepartement(departmentId).subscribe({
      next: (data: Specialty[]) => {
        console.log(`Spécialités du département ${departmentId} avant filtrage par niveau:`, data)

        // Ensuite, filtrons par niveau
        this.filteredSpecialties = data.filter((specialty: Specialty) => {
          // Vérifier si level est un objet ou une chaîne
          if (typeof specialty.level === "object" && specialty.level !== null) {
            return specialty.level._id === levelId
          } else {
            return specialty.level === levelId
          }
        })

        console.log(`Spécialités filtrées par niveau ${levelId}:`, this.filteredSpecialties)

        // Si aucune spécialité n'est trouvée après filtrage, informer l'utilisateur
        if (this.filteredSpecialties.length === 0) {
          this.showNotification(`Aucune spécialité trouvée pour ce département et ce niveau`, false)
        }

        // Réinitialiser la spécialité sélectionnée si elle n'est plus dans la liste filtrée
        if (this.activeModal === "user") {
          const currentSpecialty = this.userForm.get("specialty")?.value
          if (currentSpecialty) {
            const exists = this.filteredSpecialties.some((s) => s._id === currentSpecialty || s.id === currentSpecialty)

            if (!exists) {
              this.userForm.get("specialty")?.setValue("")
            }
          }
        } else if (this.activeModal === "enseignant") {
          const currentSpecialite = this.enseignantForm.get("specialite")?.value
          if (currentSpecialite) {
            const exists = this.filteredSpecialties.some(
              (s) => s._id === currentSpecialite || s.id === currentSpecialite,
            )

            if (!exists) {
              this.enseignantForm.get("specialite")?.setValue("")
            }
          }
        }
      },
      error: (error) => {
        console.error(`Erreur lors du chargement des spécialités:`, error)
        this.showNotification("Erreur lors du chargement des spécialités", true)
        this.filteredSpecialties = []
      },
    })
  }

  // Initialisation des formulaires
  private initForms(): void {
    // Formulaire utilisateur amélioré avec les nouveaux champs pour filière et groupe
    this.userForm = this.fb.group({
      // Informations personnelles
      lastName: ["", [Validators.required]],
      firstName: ["", [Validators.required]],
      birthDate: ["", [Validators.required]],
      civilStatus: ["", [Validators.required]],

      // Informations d'identification
      email: ["", [Validators.required, Validators.email]],
      matricule: [{ value: "" }],
      cin: ["", [Validators.required]],
      telephone: ["", [Validators.required]],

      // Adresse
      street: ["", [Validators.required]],
      postalCode: ["", [Validators.required]],
      gouvernorat: ["", [Validators.required]],
      delegation: ["", [Validators.required]],

      // Informations académiques
      level: ["", [Validators.required]],
      department: ["", [Validators.required]],
      specialty: ["", [Validators.required]],

      // Nouveaux champs pour filière et groupe (sans sous-groupe)
      filiere: ["", [Validators.required]], // Sélection de la filière
      group: ["", [Validators.required]], // Sélection du groupe
      // Suppression du champ subGroup

      // Sécurité
      password: ["", [Validators.required, Validators.minLength(6)]],
    })

    // Autres formulaires inchangés...
    this.enseignantForm = this.fb.group({
      _id: [""],
      // Informations personnelles
      firstName: ["", [Validators.required, Validators.minLength(2)]],
      lastName: ["", [Validators.required, Validators.minLength(2)]],
      name: ["", [Validators.required, Validators.minLength(3)]], // Champ complet pour la compatibilité
      birthDate: ["", [Validators.required]],
      civilStatus: ["", [Validators.required]],

      // Informations d'identification
      email: ["", [Validators.required, Validators.email]],
      cin: ["", [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      telephone: ["", [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],

      // Champs d'adresse
      street: ["", [Validators.required]],
      postalCode: ["", [Validators.required]],
      gouvernorat: ["", [Validators.required]],
      delegation: ["", [Validators.required]],

      // Informations académiques
      department: ["", [Validators.required]],
      level: [""],
      specialite: [""],
      grade: ["", [Validators.required]], // Ajout du champ grade

      // Informations supplémentaires
      couleur: ["#11cb8b"],

      // Sécurité - pour les nouveaux enseignants uniquement
      password: ["", [Validators.required, Validators.minLength(6)]],
    })

    this.levelForm = this.fb.group({
      name: ["", [Validators.required]],
      description: [""],
      couleur: ["#4a4ad4e2"],
      departement: ["", [Validators.required]],
    })

    this.specialtyForm = this.fb.group({
      name: ["", [Validators.required]],
      description: [""],
      department: ["", [Validators.required]],
      level: ["", [Validators.required]],
    })

    this.departmentForm = this.fb.group({
      name: ["", [Validators.required]],
      description: [""],
      head: [""],
    })

    this.regimeForm = this.fb.group({
      name: ["", [Validators.required]],
      description: [""],
    })
  }

  // Charger toutes les statistiques
  loadStatistics(): void {
    // Statistiques globales
    this.statsService.getStats().subscribe({
      next: (data: Stats) => {
        this.userStats = data.users
        this.specialtyStats = data.specialties
        this.departmentStats = data.departments
      },
      error: (error) => {
        console.error("Erreur lors du chargement des statistiques:", error)
      },
    })

    // Distribution des utilisateurs
    this.statsService.getUserDistribution().subscribe({
      next: (data) => (this.userDistribution = data),
      error: (error) => console.error("Erreur lors du chargement de la distribution des utilisateurs:", error),
    })

    // Spécialités par département
    this.statsService.getDeptSpecialties().subscribe({
      next: (data) => (this.deptSpecialties = data),
      error: (error) => console.error("Erreur lors du chargement des spécialités par département:", error),
    })
  }

  // Afficher la modale
  showModal(type: string): void {
    this.activeModal = type

    // Réinitialiser les formulaires quand on ouvre une modale
    if (type === "user") {
      this.userForm.reset()
      this.filteredSpecialties = []
      this.availableGroupes = []
      //this.availableSubGroups = [] // Réinitialiser les sous-groupes
      this.selectedDepartment = ""
      this.selectedLevel = ""
      this.selectedFiliere = null
    } else if (type === "enseignant") {
      if (!this.editMode) {
        this.enseignantForm.reset({
          couleur: "#11cb8b",
        })

        // Réactiver la validation du mot de passe
        const passwordControl = this.enseignantForm.get("password")
        if (passwordControl) {
          passwordControl.setValidators([Validators.required, Validators.minLength(6)])
          passwordControl.updateValueAndValidity()
        }
      } else {
        // En mode édition, s'assurer que le nom complet est correctement défini
        this.updateFullName()
      }

      // Assurez-vous que les données sont chargées avant d'afficher le modal
      if (!this.niveaux.length) {
        this.loadNiveaux()
      }
      if (!this.specialties.length) {
        this.loadSpecialties()
      }
      if (!this.departments.length) {
        this.loadDepartments()
      }
    } else if (type === "specialty") {
      this.specialtyForm.reset()
    } else if (type === "level") {
      this.levelForm.reset({
        couleur: "#4a4ad4e2",
        departement: "",
      })
      this.isEditing = false
    } else if (type === "department") {
      this.departmentForm.reset()
    } else if (type === "regime") {
      this.regimeForm.reset()
    }
  }

  // Cacher la modale
  hideModal(): void {
    this.activeModal = null
    this.editMode = false
  }

  // Affichage des notifications
  private showNotification(message: string, isError = false): void {
    this.snackBar.open(message, "Fermer", {
      duration: isError ? 5000 : 3000,
      horizontalPosition: "end",
      verticalPosition: "top",
      panelClass: isError ? ["error-notification"] : ["success-notification"],
    })
  }

  toggleSubmenu(event: Event) {
    const target = event.currentTarget as HTMLElement
    const parent = target.parentElement!
    parent.classList.toggle("open")

    event.preventDefault()
    event.stopPropagation()
  }

  // Méthode pour éditer un enseignant
  editEnseignant(enseignant: Enseignant): void {
    this.editMode = true

    // Trouver le département, niveau et spécialité correspondants
    const departmentId = this.getDepartmentIdByName(enseignant.departement)

    // Charger les spécialités pour ce département
    if (departmentId) {
      this.loadSpecialtiesForDepartment(departmentId)
    }

    // Extraire prénom et nom
    let prenom = "",
      nom = ""
    if (enseignant.name) {
      const nameParts = enseignant.name.trim().split(" ")
      if (nameParts.length >= 2) {
        prenom = nameParts[0]
        nom = nameParts.slice(1).join(" ")
      } else {
        prenom = enseignant.name
        nom = ""
      }
    }

    // Remplir le formulaire avec les données de l'enseignant
    this.enseignantForm.patchValue({
      _id: enseignant.id,
      firstName: prenom,
      lastName: nom,
      name: enseignant.name,
      cin: enseignant.cin || "",
      email: enseignant.email || "",
      department: departmentId,
      // Autres champs à remplir si disponibles
      couleur: enseignant["couleur"] || "#11cb8b",
      grade: enseignant["grade"] || "",
    })

    // Désactiver la validation du mot de passe en mode édition
    const passwordControl = this.enseignantForm.get("password")
    if (passwordControl) {
      passwordControl.clearValidators()
      passwordControl.updateValueAndValidity()
    }

    // Afficher le modal
    this.showModal("enseignant")
  }

  // Méthode pour supprimer un enseignant
  deleteEnseignant(id: number): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet enseignant ?")) {
      this.enseignantService.deleteEnseignant(id).subscribe({
        next: () => {
          // Supprimer l'enseignant des listes locales
          this.enseignants = this.enseignants.filter((e) => e.id !== id)
          this.filteredEnseignants = this.filteredEnseignants.filter((e) => e.id !== id)

          if (this.selectedEnseignant && this.selectedEnseignant.id === id) {
            this.selectedEnseignant = null
          }

          this.showNotification("Enseignant supprimé avec succès")
        },
        error: (error: any) => {
          console.error("Erreur lors de la suppression de l'enseignant:", error)
          this.showNotification("Erreur lors de la suppression de l'enseignant", true)
        },
      })
    }
  }

  // Méthodes pour filtrer les enseignants
  onDepartmentChange(): void {
    if (this.selectedDepartment) {
      this.loadSpecialtiesForDepartment(this.selectedDepartment)
      // Réinitialiser la spécialité sélectionnée quand le département change
      this.selectedSpecialty = ""
    } else {
      this.filteredSpecialties = []
    }
    this.applyFilters()
  }

  applyFilters(): void {
    // Filtrer les enseignants selon les critères sélectionnés
    this.filteredEnseignants = this.enseignants.filter((enseignant) => {
      const matchesDepartment =
        !this.selectedDepartment || this.getDepartmentIdByName(enseignant.departement) === this.selectedDepartment
      const matchesLevel = !this.selectedLevel // Ajouter la logique si nécessaire
      const matchesSpecialty = !this.selectedSpecialty // Ajouter la logique si nécessaire

      return matchesDepartment && matchesLevel && matchesSpecialty
    })

    // Si aucun enseignant ne correspond, afficher un message
    if (
      this.filteredEnseignants.length === 0 &&
      (this.selectedDepartment || this.selectedLevel || this.selectedSpecialty)
    ) {
      this.showNotification("Aucun enseignant ne correspond à vos critères de recherche", false)
    }
  }

  resetFilters(): void {
    this.selectedDepartment = ""
    this.selectedLevel = ""
    this.selectedSpecialty = ""
    this.filteredSpecialties = []
    this.filteredEnseignants = [...this.enseignants]
    this.showNotification("Filtres réinitialisés", false)
  }

  // Helper methods
  getDepartmentIdByName(name: string): string {
    if (!name || !this.departments || this.departments.length === 0) {
      return ""
    }

    const department = this.departments.find((dept) => dept.name === name)
    return department ? department._id : ""
  }

  getDepartmentName(id: string): string {
    if (!id || !this.departments || this.departments.length === 0) {
      return ""
    }

    const department = this.departments.find((dept) => dept._id === id)
    return department ? department.name : ""
  }

  getLevelName(id: string): string {
    if (!id || !this.niveaux || this.niveaux.length === 0) {
      return ""
    }

    const level = this.niveaux.find((n) => n._id === id)
    return level ? level.name : ""
  }

  getSpecialiteName(id: string): string {
    if (!id || !this.specialties || this.specialties.length === 0) {
      return ""
    }

    const specialty = this.specialties.find((s) => s._id === id || s.id === id)
    return specialty ? specialty.name : ""
  }

  // Methode pour ajouter un enseignant à la liste locale
  addUserAsEnseignant(userData: any): void {
    const newEnseignant: Enseignant = {
      id: Date.now(), // Temporaire, sera remplacé par l'ID réel du backend
      name: userData.name,
      cin: userData.cin,
      email: userData.email,
      departement: this.getDepartmentName(userData.department),
      birthDate: userData.birthDate,
      civilStatus: userData.civilStatus,
      telephone: userData.telephone,
      couleur: userData.couleur,
      grade: userData.grade,
    }

    this.enseignants.push(newEnseignant)
    this.filteredEnseignants.push(newEnseignant)
  }

  // Méthode pour mettre à jour un enseignant dans la liste locale
  updateLocalEnseignant(userData: any, id: number): void {
    // Trouver l'enseignant dans la liste
    const index = this.enseignants.findIndex((e) => e.id === id)
    const indexFiltered = this.filteredEnseignants.findIndex((e) => e.id === id)

    if (index !== -1) {
      // Mettre à jour les propriétés de l'enseignant
      this.enseignants[index] = {
        ...this.enseignants[index],
        name: userData.name,
        cin: userData.cin,
        email: userData.email,
        departement: this.getDepartmentName(userData.department),
        telephone: userData.telephone,
        couleur: userData.couleur,
        grade: userData.grade,
      }
    }

    if (indexFiltered !== -1) {
      this.filteredEnseignants[indexFiltered] = {
        ...this.filteredEnseignants[indexFiltered],
        name: userData.name,
        cin: userData.cin,
        email: userData.email,
        departement: this.getDepartmentName(userData.department),
        telephone: userData.telephone,
        couleur: userData.couleur,
        grade: userData.grade,
      }
    }

    // Si c'est l'enseignant sélectionné, mettre à jour aussi
    if (this.selectedEnseignant && this.selectedEnseignant.id === id) {
      this.selectedEnseignant = {
        ...this.selectedEnseignant,
        name: userData.name,
        cin: userData.cin,
        email: userData.email,
        departement: this.getDepartmentName(userData.department),
        telephone: userData.telephone,
        couleur: userData.couleur,
        grade: userData.grade,
      }
    }
  }

  // Méthode submitForm complète pour le composant AdminComponent
  submitForm(type: string): void {
    if (type === "user" && this.userForm.valid) {
      console.log("Formulaire utilisateur soumis:", this.userForm.value)
      this.submitting = true

      try {
        // Format the data according to your MongoDB model
        const userData = {
          name: `${this.userForm.value.firstName} ${this.userForm.value.lastName}`,
          email: this.userForm.value.email,
          cin: this.userForm.value.cin,
          level: this.userForm.value.level,
          department: this.userForm.value.department,
          specialty: this.userForm.value.specialty,
          filiere: this.userForm.value.filiere,
          group: this.userForm.value.group,
          // Ajouter subGroup seulement s'il est présent dans le formulaire
          ...(this.userForm.value.subGroup && { subGroup: this.userForm.value.subGroup }),
          password: this.userForm.value.password,
          telephone: this.userForm.value.telephone,
          birthDate: this.userForm.value.birthDate,
          civilStatus: this.userForm.value.civilStatus,
          address: {
            street: this.userForm.value.street,
            postalCode: this.userForm.value.postalCode,
            gouvernorat: this.userForm.value.gouvernorat,
            delegation: this.userForm.value.delegation,
          },
        }

        console.log("Données utilisateur préparées pour MongoDB:", userData)

        this.userService.addUser(userData).subscribe({
          next: (response) => {
            console.log("Réponse après ajout utilisateur:", response)
            this.showNotification("Utilisateur ajouté avec succès!")
            this.userForm.reset()
            this.hideModal()

            // Recharger les statistiques pour refléter les changements
            this.loadStatistics()
            this.submitting = false
          },
          error: (error) => {
            console.error("Erreur détaillée:", error)
            this.showNotification(
              "Erreur lors de l'ajout de l'utilisateur: " +
                (error.error?.message || error.error?.error || error.message || "Erreur inconnue"),
              true,
            )
            this.submitting = false
          },
        })
      } catch (error: any) {
        console.error("Erreur lors de la préparation des données:", error)
        this.showNotification("Erreur: " + (error.message || "Veuillez vérifier les données saisies."), true)
        this.submitting = false
      }
    } else if (type === "enseignant" && this.enseignantForm.valid) {
      if (this.submitting) return // Évite les doubles soumissions
      this.submitting = true

      try {
        const formValues = this.enseignantForm.value
        console.log("Valeurs du formulaire enseignant:", formValues)

        // Vérification des champs obligatoires
        const requiredFields = ["name", "cin", "email", "department", "grade"]
        const missingFields = []

        for (const field of requiredFields) {
          if (!formValues[field] || (Array.isArray(formValues[field]) && formValues[field].length === 0)) {
            missingFields.push(field)
          }
        }

        if (missingFields.length > 0) {
          throw new Error(`Champs manquants: ${missingFields.join(", ")}`)
        }

        // Préparation des données à envoyer
        const enseignantData = {
          name: formValues.name?.trim() || "",
          firstName: formValues.firstName?.trim() || "",
          lastName: formValues.lastName?.trim() || "",
          cin: formValues.cin?.trim() || "",
          email: formValues.email?.trim() || "",
          telephone: formValues.telephone?.trim() || "",
          birthDate: formValues.birthDate || "",
          civilStatus: formValues.civilStatus || "",
          level: formValues.level ? String(formValues.level) : "",
          department: String(formValues.department),
          specialite: formValues.specialite ? String(formValues.specialite) : "",
          grade: formValues.grade?.trim() || "",
          password: formValues.password || "123456",
          couleur: formValues.couleur || "#11cb8b",
          // Adresse
          address: {
            street: formValues.street || "",
            postalCode: formValues.postalCode || "",
            gouvernorat: formValues.gouvernorat || "",
            delegation: formValues.delegation || "",
          },
          // Inclure aussi les champs d'adresse directement pour la compatibilité
          street: formValues.street || "",
          postalCode: formValues.postalCode || "",
          gouvernorat: formValues.gouvernorat || "",
          delegation: formValues.delegation || "",
          // Rôle
          role: "enseignant",
        }

        console.log("Données formatées pour API:", enseignantData)

        if (this.editMode && formValues._id) {
          // Mise à jour d'un enseignant existant
          this.enseignantService.updateEnseignant(formValues._id, enseignantData).subscribe({
            next: (response) => {
              this.showNotification("Enseignant mis à jour avec succès!")
              // Mettre à jour l'enseignant dans la liste locale
              this.updateLocalEnseignant(enseignantData, formValues._id)
              this.hideModal()
              this.submitting = false
            },
            error: (error) => {
              this.handleSubmitError(error)
            },
          })
        } else {
          // Ajout d'un nouvel enseignant
          this.enseignantService.addEnseignant(enseignantData).subscribe({
            next: (response) => {
              this.showNotification("Enseignant ajouté avec succès! 🎉")
              // Ajouter l'enseignant à la liste locale
              this.addUserAsEnseignant({
                ...enseignantData,
                niveauName: this.getLevelName(enseignantData.level),
                departmentName: this.getDepartmentName(enseignantData.department),
                specialiteName: this.getSpecialiteName(enseignantData.specialite),
              })

              this.hideModal()
              this.submitting = false
            },
            error: (error) => {
              this.handleSubmitError(error)
            },
          })
        }
      } catch (error: any) {
        console.error("Erreur lors de la soumission:", error)
        this.showNotification("Erreur: " + (error.message || "Veuillez vérifier les données saisies."), true)
        this.submitting = false
      }
    } else if (type === "specialty" && this.specialtyForm.valid) {
      const specialtyData = {
        name: this.specialtyForm.value.name,
        description: this.specialtyForm.value.description || "",
        department: this.specialtyForm.value.department,
        level: this.specialtyForm.value.level,
      }

      this.specialitesService.addSpecialite(specialtyData).subscribe({
        next: (response) => {
          console.log("Réponse après ajout spécialité:", response)
          this.showNotification("Spécialité ajoutée avec succès!")
          this.specialtyForm.reset()
          this.hideModal()

          // Recharger les spécialités et les statistiques
          this.loadSpecialties()
          this.loadStatistics()

          // Si un département et un niveau étaient sélectionnés dans le formulaire utilisateur,
          // recharger les spécialités filtrées
          if (this.selectedDepartment && this.selectedLevel) {
            this.filterSpecialties()
          }
        },
        error: (error) => {
          console.error("Erreur d'ajout:", error)
          this.showNotification(
            "Erreur lors de l'ajout de la spécialité: " + (error.error?.error || error.message),
            true,
          )
        },
      })
    } else if (type === "level" && this.levelForm.valid) {
      const niveauData = {
        name: this.levelForm.value.name,
        description: this.levelForm.value.description || "",
        couleur: this.levelForm.value.couleur || "#4a4ad4e2",
        departement: this.levelForm.value.departement,
      }

      console.log("Données du niveau à envoyer:", niveauData)

      this.niveauService.addNiveau(niveauData).subscribe({
        next: (response) => {
          this.showNotification("Niveau ajouté avec succès!")
          this.levelForm.reset()
          this.hideModal()

          // Recharger les niveaux
          this.loadNiveaux()
        },
        error: (error) => {
          console.error("Erreur lors de l'ajout du niveau :", error)
          this.showNotification("Une erreur s'est produite. Veuillez réessayer.", true)
        },
      })
    } else if (type === "regime" && this.regimeForm.valid) {
      // Simuler l'ajout d'un régime (à remplacer par l'appel API réel)
      this.showNotification("Régime ajouté avec succès!")

      this.regimeForm.reset()
      this.hideModal()
    } else if (type === "department" && this.departmentForm.valid) {
      const departmentData = {
        name: this.departmentForm.value.name,
        description: this.departmentForm.value.description || "",
        head: this.departmentForm.value.head || "",
      }

      this.departementsService.addDepartement(departmentData).subscribe({
        next: (response) => {
          console.log("Réponse après ajout département:", response)
          this.showNotification("Département ajouté avec succès!")
          this.departmentForm.reset()
          this.hideModal()

          // Recharger les départements et les statistiques
          this.loadDepartments()
          this.loadStatistics()
        },
        error: (error) => {
          console.error("Erreur d'ajout:", error)
          this.showNotification("Erreur lors de l'ajout du département: " + (error.error?.error || error.message), true)
        },
      })
    } else {
      // Vérifier si le problème vient de la validation du formulaire
      if (type === "enseignant" && !this.enseignantForm.valid) {
        console.log("Formulaire enseignant invalide:", this.enseignantForm.errors)
        console.log("Statut des champs:", {
          name: this.enseignantForm.get("name")?.errors,
          firstName: this.enseignantForm.get("firstName")?.errors,
          lastName: this.enseignantForm.get("lastName")?.errors,
          cin: this.enseignantForm.get("cin")?.errors,
          email: this.enseignantForm.get("email")?.errors,
          department: this.enseignantForm.get("department")?.errors,
          grade: this.enseignantForm.get("grade")?.errors,
          password: this.enseignantForm.get("password")?.errors,
        })

        // Message plus détaillé pour aider à identifier le problème
        const invalidFields = Object.keys(this.enseignantForm.controls)
          .filter((key) => !this.enseignantForm.get(key)?.valid && this.enseignantForm.get(key)?.touched)
          .join(", ")

        this.showNotification(`Formulaire invalide. Champs à vérifier: ${invalidFields}`, true)
      } else if (type === "user" && !this.userForm.valid) {
        console.log("Formulaire utilisateur invalide:", this.userForm.errors)

        // Message détaillé pour les champs invalides du formulaire utilisateur
        const invalidUserFields = Object.keys(this.userForm.controls)
          .filter((key) => !this.userForm.get(key)?.valid && this.userForm.get(key)?.touched)
          .join(", ")

        this.showNotification(`Formulaire utilisateur invalide. Champs à vérifier: ${invalidUserFields}`, true)
      } else {
        this.showNotification("Veuillez remplir tous les champs obligatoires.", true)
      }
    }
  }

  // Gérer les erreurs de soumission
  handleSubmitError(error: any): void {
    console.error("Erreur détaillée:", error)

    // Afficher plus de détails sur l'erreur
    if (error.error) console.error("Corps de l'erreur:", error.error)
    if (error.status) {
      console.error("Code d'état HTTP:", error.status)
    }

    let errorMessage = "Erreur lors de l'opération: "

    // Construire un message d'erreur plus informatif
    if (error.error && typeof error.error === "object") {
      const errorDetails = Object.entries(error.error)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      errorMessage += errorDetails || "Veuillez vérifier les données saisies."
    } else if (error.message) {
      errorMessage += error.message
    } else if (typeof error.error === "string") {
      errorMessage += error.error
    } else {
      errorMessage += "Veuillez réessayer."
    }

    this.showNotification(errorMessage, true)
    this.submitting = false
  }
}
