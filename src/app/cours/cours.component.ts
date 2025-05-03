import { Component, type OnInit } from "@angular/core"

// Define or import the ICours interface
interface ICours {
  _id: string
  titre: string
  description?: string
  niveau: string
  specialite: string
  departement: string
  seance: string
  semestre: string
  heures: string // Ajout du champ heures
}

import  { FormBuilder } from "@angular/forms"
import  { MatSnackBar } from "@angular/material/snack-bar"
import  { SpecialitesService } from "../specialites.service"
import  { NiveauxService } from "../niveaux.service"
import  { DepartementsService } from "../departements.service"
import  { EnseignantService } from "../enseignant.service"
import  { CoursService } from "../cours.service"

@Component({
  selector: "app-cours",
  templateUrl: "./cours.component.html",
  styleUrls: ["./cours.component.css"],
})
export class CoursComponent implements OnInit {
  // Propriétés existantes
  niveaux: any[] = []
  specialites: any[] = []
  filteredSpecialties: any[] = []
  departments: any[] = []
  selectedDepartment = ""
  cours: any[] = []
  coursAvecDetails: any[] = []
  selectedCours: any = null

  // Propriétés pour l'édition
  showEditForm = false
  courseToEdit: any = null

  // Propriétés de chargement
  loadingCours = false
  loadingNiveaux = false
  loadingSpecialites = false
  loadingDepartments = false
  submitting = false

  // Propriétés pour le formulaire d'ajout
  showAddForm = false
  newCours = {
    titre: "",
    description: "",
    niveau: "",
    specialite: "",
    departement: "",
    seance: "",
    semestre: "",
    heures: "", // Ajout du champ heures
  }
  formSubmitted = false
  errorMessage = ""

  // Propriétés pour les filtres
  filterDepartement: any = ""
  filterSpecialite: any = ""
  filterNiveau: any = ""
  filterSemestre: any = ""
  filterSpecialities: any[] = []
  filteredCours: any[] = []
  isFiltered = false

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private departementsService: DepartementsService,
    private enseignantService: EnseignantService,
    private coursService: CoursService,
  ) {
    /*this.coursForm = this.fb.group({
      titre: ["", [Validators.required, Validators.minLength(3)]],
      description: ["", [Validators.required, Validators.minLength(10)]],
      enseignant: ["", Validators.required],
      departement: ["", Validators.required],
      niveau: ["", Validators.required],
      specialite: ["", Validators.required],
      fichiers: [[]],
      semestre: [1, Validators.required],
      heure: [2, Validators.required],
      code: ["", Validators.required],
      seance: ["", Validators.required],
    })*/
  }

  ngOnInit(): void {
    this.loadInitialData()

    // Écouter les changements de département pour filtrer les spécialités
    /*this.coursForm.get("departement")?.valueChanges.subscribe((departementId) => {
      if (departementId) {
        this.loadSpecialitesForDepartement(departementId)
      } else {
        this.filteredSpecialites = []
      }
      // Réinitialiser la spécialité sélectionnée
      this.coursForm.get("specialite")?.setValue("")
    })*/
  }

  loadInitialData(): void {
    this.loadingCours = true
    this.loadingNiveaux = true
    this.loadingSpecialites = true
    this.loadingDepartments = true

    // Load existing courses
    this.loadCoursesWithDetails()

    // Load other data as needed
    this.loadNiveaux()
    this.loadDepartments()
  }

  // Méthode pour charger les cours avec leurs détails
  loadCoursesWithDetails(): void {
    this.loadingCours = true
    this.coursService.getAllCours().subscribe({
      next: (data) => {
        console.log("Cours chargés:", data)
        this.cours = data

        // Traiter chaque cours pour obtenir les détails
        this.coursAvecDetails = []

        if (data.length === 0) {
          this.loadingCours = false
          this.filteredCours = []
          return
        }

        // Créer une copie des cours avec des valeurs par défaut
        this.coursAvecDetails = data.map((cours) => ({
          ...cours,
          niveauName: "Non spécifié",
          specialiteName: "Non spécifiée",
          departementName: "Non spécifié",
        }))

        // Initialiser les cours filtrés immédiatement
        this.filteredCours = [...this.coursAvecDetails]

        // Charger les détails en arrière-plan sans bloquer l'affichage
        this.chargerDetailsEnArrierePlan(data)
      },
      error: (error) => {
        console.error("Erreur lors du chargement des cours:", error)
        this.showNotification("Erreur lors du chargement des cours. Le serveur pourrait être indisponible.", true)
        this.cours = []
        this.coursAvecDetails = []
        this.filteredCours = []
        this.loadingCours = false
      },
    })
  }

  // Nouvelle méthode pour charger les détails en arrière-plan
  chargerDetailsEnArrierePlan(cours: any[]): void {
    // Charger tous les niveaux, départements et spécialités en une seule fois
    const niveauxPromise = this.niveauxService.getNiveaux().toPromise()
    const specialitesPromise = this.specialitesService.getSpecialites().toPromise()
    const departementsPromise = this.departementsService.getDepartements().toPromise()

    // Utiliser Promise.all pour attendre que toutes les données soient chargées
    Promise.all([niveauxPromise, specialitesPromise, departementsPromise])
      .then(([niveaux, specialites, departements]) => {
        // Mettre à jour les détails des cours
        this.coursAvecDetails = this.coursAvecDetails.map((coursDetail) => {
          // Trouver le niveau correspondant
          if (coursDetail.niveau) {
            const niveau = (niveaux ?? []).find((n: any) => n._id === coursDetail.niveau)
            if (niveau) {
              coursDetail.niveauName = niveau.name
            }
          }

          // Trouver la spécialité correspondante
          if (coursDetail.specialite) {
            const specialite = (specialites ?? []).find((s: any) => s._id === coursDetail.specialite)
            if (specialite) {
              coursDetail.specialiteName = specialite.name
            } else {
              console.log(`Spécialité non trouvée pour l'ID: ${coursDetail.specialite}`)
              coursDetail.specialiteName = "Spécialité non trouvée"
            }
          }

          // Trouver le département correspondant
          if (coursDetail.departement) {
            const departement = departements.find((d: any) => d._id === coursDetail.departement)
            if (departement) {
              coursDetail.departementName = departement.name
            } else {
              console.log(`Département non trouvé pour l'ID: ${coursDetail.departement}`)
              coursDetail.departementName = "Département non trouvé"
            }
          }

          return coursDetail
        })

        // Mettre à jour les cours filtrés
        this.filteredCours = [...this.coursAvecDetails]
        this.applyFilters()
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des détails:", error)
      })
      .finally(() => {
        this.loadingCours = false
      })
  }

  // Méthode existante pour charger les cours (conservée pour compatibilité)
  loadCourses(): void {
    this.loadingCours = true
    this.coursService.getAllCours().subscribe({
      next: (data) => {
        console.log("Cours chargés:", data)
        this.cours = data
        this.filteredCours = [...data] // Initialiser les cours filtrés
        this.loadingCours = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des cours:", error)
        this.showNotification("Erreur lors du chargement des cours. Le serveur pourrait être indisponible.", true)
        this.cours = []
        this.filteredCours = []
        this.loadingCours = false
      },
    })
  }

  getColor(niveau: string): string {
    // Attribue une couleur en fonction du niveau
    switch (niveau.toLowerCase()) {
      case "débutant":
        return "#11cb8b"
      case "intermédiaire":
        return "#25c0fc"
      case "avancé":
        return "#9b59b6"
      default:
        return "#11cb8b"
    }
  }

  // Méthode pour obtenir une couleur de dégradé en fonction du niveau
  getGradientColor(niveau: string): string {
    if (!niveau) return "linear-gradient(to right, #11cb8b, #11cb8b)"

    switch (niveau.toLowerCase()) {
      case "débutant":
        return "linear-gradient(to right, #11cb8b, #2ecc71)"
      case "intermédiaire":
        return "linear-gradient(to right, #25c0fc, #3498db)"
      case "avancé":
        return "linear-gradient(to right, #9b59b6, #8e44ad)"
      default:
        return "linear-gradient(to right, #11cb8b, #2ecc71)"
    }
  }

  selectCours(item: any) {
    this.selectedCours = item
  }

  // Method to load specialties for a specific department
  loadSpecialtiesForDepartment(departmentId: string): void {
    console.log("Chargement des spécialités pour le département:", departmentId)

    if (!departmentId) {
      this.filteredSpecialties = []
      this.filterSpecialities = []
      return
    }

    this.loadingSpecialites = true
    this.specialitesService.getSpecialitesByDepartement(departmentId).subscribe({
      next: (data) => {
        console.log(`Spécialités du département ${departmentId}:`, data)
        this.filteredSpecialties = data
        this.filterSpecialities = data // Mettre à jour les spécialités pour le filtre
        this.loadingSpecialites = false

        // If no specialties are found, inform the user
        if (data.length === 0) {
          this.showNotification(`Aucune spécialité trouvée pour ce département`, false)
        } else if (data.length > 0) {
          // Set first specialty as default
          this.newCours.specialite = data[0]._id

          // If we're editing, don't automatically change the specialty
          if (this.showEditForm && this.courseToEdit) {
            // Only set default if specialty doesn't exist in the new list
            const specialiteExists = data.some((s: { _id: string }) => s._id === this.courseToEdit.specialite)
            if (!specialiteExists) {
              this.courseToEdit.specialite = data[0]._id
            }
          }
        }
      },
      error: (error) => {
        console.error(`Erreur lors du chargement des spécialités pour le département ${departmentId}:`, error)
        this.showNotification("Erreur lors du chargement des spécialités", true)
        this.filteredSpecialties = []
        this.filterSpecialities = []
        this.loadingSpecialites = false
      },
    })
  }

  // Méthode mise à jour pour le changement de département
  onDepartmentChange(): void {
    if (this.selectedDepartment) {
      this.loadSpecialtiesForDepartment(this.selectedDepartment)

      // Update the appropriate object based on which form is active
      if (this.showEditForm) {
        this.courseToEdit.departement = this.selectedDepartment
      } else {
        this.newCours.departement = this.selectedDepartment
      }

      // Réinitialiser la spécialité lorsque le département change
      if (this.showEditForm) {
        this.courseToEdit.specialite = ""
      } else {
        this.newCours.specialite = ""
      }
    } else {
      this.filteredSpecialties = []
      this.filterSpecialities = []
    }
  }

  // Method to load levels
  loadNiveaux(): void {
    this.loadingNiveaux = true
    this.niveauxService.getNiveaux().subscribe({
      next: (data) => {
        console.log("Niveaux chargés:", data)
        this.niveaux = data
        this.loadingNiveaux = false

        if (data.length > 0) {
          this.newCours.niveau = data[0]._id
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des niveaux:", error)
        this.showNotification("Erreur lors du chargement des niveaux. Veuillez réessayer.", true)
        this.loadingNiveaux = false
      },
    })
  }

  // Method to load departments
  loadDepartments(): void {
    this.loadingDepartments = true
    this.departementsService.getDepartements().subscribe({
      next: (data) => {
        console.log("Départements chargés:", data)
        this.departments = data
        this.loadingDepartments = false

        if (data.length > 0) {
          this.selectedDepartment = data[0]._id
          this.newCours.departement = data[0]._id
          this.loadSpecialtiesForDepartment(data[0]._id)
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des départements:", error)
        this.showNotification("Erreur lors du chargement des départements", true)
        this.loadingDepartments = false
      },
    })
  }

  // Update the toggleAddForm method
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm

    // Close edit form if open
    if (this.showAddForm) {
      this.showEditForm = false
      this.courseToEdit = null
    }

    if (this.showAddForm) {
      // If showing the form, ensure data is loaded
      if (!this.niveaux.length) {
        this.loadNiveaux()
      }
      if (!this.departments.length) {
        this.loadDepartments()
      }
    } else {
      // Reset form when closing
      this.resetForm()
    }
  }

  // Update the addCours method
  addCours(): void {
    this.formSubmitted = true
    this.errorMessage = ""

    // Validate required fields
    if (!this.newCours.titre || !this.newCours.titre.trim()) {
      this.errorMessage = "Le titre du cours est obligatoire."
      return
    }

    if (!this.newCours.niveau) {
      this.errorMessage = "Veuillez sélectionner un niveau."
      return
    }

    if (!this.newCours.specialite) {
      this.errorMessage = "Veuillez sélectionner une spécialité."
      return
    }

    if (!this.newCours.departement) {
      this.errorMessage = "Veuillez sélectionner un département."
      return
    }

    if (!this.newCours.seance) {
      this.errorMessage = "Veuillez sélectionner une séance."
      return
    }

    if (!this.newCours.semestre) {
      this.errorMessage = "Veuillez sélectionner un semestre."
      return
    }

    if (!this.newCours.heures) {
      this.errorMessage = "Veuillez sélectionner le nombre d'heures."
      return
    }

    this.submitting = true

    // Create the course object with all required fields
    const nouveauCours = {
      titre: this.newCours.titre.trim(),
      description: this.newCours.description || "",
      niveau: this.newCours.niveau,
      specialite: this.newCours.specialite,
      departement: this.newCours.departement,
      seance: this.newCours.seance,
      semestre: this.newCours.semestre,
      heures: this.newCours.heures,
    }

    console.log("Envoi du cours (détaillé):", JSON.stringify(nouveauCours))

    this.coursService.addCours(nouveauCours).subscribe({
      next: (response) => {
        console.log("Cours ajouté avec succès (détaillé):", JSON.stringify(response))

        // Add the new course to the local array with the ID from the response
        this.cours.push(response)

        // Reset the form
        this.resetForm()
        this.showAddForm = false
        this.formSubmitted = false

        // Show success notification
        this.showNotification("Cours ajouté avec succès!")
        this.submitting = false

        // Reload courses to ensure we have the latest data
        this.loadCoursesWithDetails()
      },
      error: (error) => {
        console.error("Erreur lors de l'ajout du cours (détaillé):", JSON.stringify(error))
        let errorMessage = "Erreur lors de l'ajout du cours"

        // Try to extract more specific error message
        if (error.error && error.error.message) {
          errorMessage += ": " + error.error.message
        } else if (error.status === 0) {
          errorMessage += ": Impossible de se connecter au serveur. Vérifiez que le serveur est en cours d'exécution."
        } else if (error.status === 400) {
          errorMessage += ": Données invalides. Vérifiez tous les champs."

          // Check for validation errors
          if (error.error && error.error.validationErrors) {
            const validationErrors = error.error.validationErrors
            errorMessage +=
              " Erreurs: " +
              Object.keys(validationErrors)
                .map((key) => `${key}: ${validationErrors[key]}`)
                .join(", ")
          }

          // Check for missing fields
          if (error.error && error.error.missingFields) {
            errorMessage += " Champs manquants: " + error.error.missingFields.join(", ")
          }
        } else if (error.status === 500) {
          errorMessage += ": Erreur serveur. Veuillez contacter l'administrateur."
        }

        this.errorMessage = errorMessage
        this.showNotification(errorMessage, true)
        this.submitting = false
      },
    })
  }

  resetForm(): void {
    this.newCours = {
      titre: "",
      description: "",
      niveau: "",
      specialite: "",
      departement: "",
      seance: "",
      semestre: "",
      heures: "",
    }
    this.formSubmitted = false
    this.errorMessage = ""
  }

  specialties: any[] = []

  // Filter methods
  applyFilters(): void {
    this.isFiltered = !!(this.filterDepartement || this.filterSpecialite || this.filterNiveau || this.filterSemestre)

    if (!this.isFiltered) {
      this.filteredCours = [...this.coursAvecDetails]
      return
    }

    this.filteredCours = this.coursAvecDetails.filter((cours) => {
      const matchDepartement = !this.filterDepartement || cours.departement === this.filterDepartement
      const matchSpecialite = !this.filterSpecialite || cours.specialite === this.filterSpecialite
      const matchNiveau = !this.filterNiveau || cours.niveau === this.filterNiveau
      const matchSemestre = !this.filterSemestre || cours.semestre === this.filterSemestre

      return matchDepartement && matchSpecialite && matchNiveau && matchSemestre
    })

    // Update specialties list if department filter is applied
    if (this.filterDepartement) {
      this.loadSpecialtiesForDepartment(this.filterDepartement)
    } else {
      // Reset specialties filter list if no department is selected
      this.filterSpecialities = this.specialites
    }
  }

  resetFilters(): void {
    this.filterDepartement = ""
    this.filterSpecialite = ""
    this.filterNiveau = ""
    this.filterSemestre = ""
    this.filterSpecialities = this.specialites
    this.isFiltered = false
    this.filteredCours = [...this.coursAvecDetails]
  }

  cancelEdit(): void {
    this.showEditForm = false
    this.courseToEdit = null
    this.errorMessage = ""
  }

  editCours(course: ICours): void {
    this.courseToEdit = { ...course }
    this.selectedDepartment = course.departement
    this.showEditForm = true

    // Load specialties for the department
    this.loadSpecialtiesForDepartment(course.departement)
  }

  saveEditedCours(): void {
    this.formSubmitted = true
    this.errorMessage = ""

    // Validate required fields
    if (!this.courseToEdit.titre || !this.courseToEdit.titre.trim()) {
      this.errorMessage = "Le titre du cours est obligatoire."
      return
    }

    if (!this.courseToEdit.niveau) {
      this.errorMessage = "Veuillez sélectionner un niveau."
      return
    }

    if (!this.courseToEdit.specialite) {
      this.errorMessage = "Veuillez sélectionner une spécialité."
      return
    }

    if (!this.courseToEdit.departement) {
      this.errorMessage = "Veuillez sélectionner un département."
      return
    }

    if (!this.courseToEdit.seance) {
      this.errorMessage = "Veuillez sélectionner une séance."
      return
    }

    if (!this.courseToEdit.semestre) {
      this.errorMessage = "Veuillez sélectionner un semestre."
      return
    }

    if (!this.courseToEdit.heures) {
      this.errorMessage = "Veuillez sélectionner le nombre d'heures."
      return
    }

    this.submitting = true

    // Prepare data for update - make sure to include all required fields
    const coursToUpdate = {
      _id: this.courseToEdit._id,
      titre: this.courseToEdit.titre.trim(),
      description: this.courseToEdit.description || "",
      niveau: this.courseToEdit.niveau,
      specialite: this.courseToEdit.specialite,
      departement: this.courseToEdit.departement,
      seance: this.courseToEdit.seance,
      semestre: this.courseToEdit.semestre,
      heures: this.courseToEdit.heures,
    }

    console.log("Mise à jour du cours:", JSON.stringify(coursToUpdate))

    // Call the service to update the course
    this.coursService.updateCours(coursToUpdate._id, coursToUpdate).subscribe({
      next: (response) => {
        console.log("Cours mis à jour avec succès:", response)

        // Close the edit form
        this.showEditForm = false
        this.courseToEdit = null
        this.formSubmitted = false
        this.submitting = false

        // Show success notification
        this.showNotification("Cours mis à jour avec succès!")

        // Reload courses list
        this.loadCoursesWithDetails()
      },
      error: (error) => {
        console.error("Erreur lors de la mise à jour du cours:", error)

        let errorMessage = "Erreur lors de la mise à jour du cours"

        if (error.error && error.error.message) {
          errorMessage += ": " + error.error.message
        } else if (error.status === 0) {
          errorMessage += ": Impossible de se connecter au serveur."
        } else if (error.status === 400) {
          errorMessage += ": Données invalides. Vérifiez tous les champs."
        } else if (error.status === 404) {
          errorMessage += ": Cours non trouvé."
        } else if (error.status === 500) {
          errorMessage += ": Erreur serveur. Veuillez contacter l'administrateur."
        }

        this.errorMessage = errorMessage
        this.showNotification(errorMessage, true)
        this.submitting = false
      },
    })
  }

  // Delete course method
  deleteCours(id: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) {
      this.coursService.deleteCours(id).subscribe({
        next: () => {
          // Remove from local arrays
          this.cours = this.cours.filter((c) => c._id !== id)
          this.coursAvecDetails = this.coursAvecDetails.filter((c) => c._id !== id)
          this.filteredCours = this.filteredCours.filter((c) => c._id !== id)

          if (this.selectedCours && this.selectedCours._id === id) {
            this.selectedCours = null
          }

          this.showNotification("Cours supprimé avec succès")
        },
        error: (error) => {
          console.error("Erreur lors de la suppression du cours:", error)

          // If the API endpoint doesn't exist but you want to update the UI anyway
          if (error.status === 404) {
            // Show a modified message
            this.showNotification(
              "Le backend ne supporte pas encore la suppression, mais l'élément a été retiré de l'interface",
              true,
            )

            // Remove from local arrays anyway
            this.cours = this.cours.filter((c) => c._id !== id)
            this.coursAvecDetails = this.coursAvecDetails.filter((c) => c._id !== id)
            this.filteredCours = this.filteredCours.filter((c) => c._id !== id)

            if (this.selectedCours && this.selectedCours._id === id) {
              this.selectedCours = null
            }
          } else {
            // Handle other errors
            const errorMessage = "Erreur lors de la suppression du cours"
            this.showNotification(errorMessage, true)
          }
        },
      })
    }
  }

  // Helper method for notifications
  showNotification(message: string, isError = false): void {
    this.snackBar.open(message, "Fermer", {
      duration: 5000,
      horizontalPosition: "center",
      verticalPosition: "bottom",
      panelClass: isError ? ["error-snackbar"] : ["success-snackbar"],
    })
  }
}
