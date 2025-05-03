import { Component, type OnInit } from "@angular/core"
import {  FormArray,  FormBuilder, type FormGroup, Validators } from "@angular/forms"
import  { DepartementsService } from ".././departements.service"
import  { SpecialitesService } from ".././specialites.service"
import  { NiveauxService } from ".././niveaux.service"
import  { VoeuxService, Voeux, VoeuxStats } from ".././voeux.service"
import  { CoursService, Cours } from ".././cours.service"
import  { EnseignantService } from ".././enseignant.service"
import { forkJoin } from "rxjs"

@Component({
  selector: "app-assignation",
  templateUrl: "./assignation.component.html",
  styleUrls: ["./assignation.component.css"],
})
export class AssignationComponent implements OnInit {
  // États et données
  isLoading = false
  showFilters = false
  voeuxList: Voeux[] = []
  filteredVoeuxList: Voeux[] = []
  departements: any[] = []
  specialites: any[] = []
  niveaux: any[] = []
  matieres: Cours[] = []
  enseignants: any[] = []
  groupes: any[] = []
  sousGroupes: { [key: string]: any[] } = {}
  filteredMatieres: Cours[] = []
  filteredEnseignants: any[] = []

  // Filtres
  searchTerm = ""
  filterDepartement = ""
  filterSpecialite = ""
  filterSemestre = ""
  filterStatus = ""
  filterTypesSeance = "tous"
  sortBy = "date-desc"

  // Pagination
  currentPage = 1
  itemsPerPage = 10
  totalPages = 1

  // Modals
  showAssignationModal = false
  currentStep = 1
  selectedVoeu: Voeux | null = null

  // Formulaires
  assignationForm: FormGroup

  // Statistiques
  stats: VoeuxStats = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  }

  // Pour utiliser Math dans le template
  Math = Math

  constructor(
    private fb: FormBuilder,
    private departementsService: DepartementsService,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private voeuxService: VoeuxService,
    private coursService: CoursService,
    private enseignantService: EnseignantService,
  ) {
    this.assignationForm = this.fb.group({
      enseignantId: ["", Validators.required],
      matieres: this.fb.array([this.createMatiereFormGroup()]),
      groupes: this.fb.array([this.createGroupeFormGroup()]),
      chargeHoraire: this.fb.group({
        cours: [0, [Validators.required, Validators.min(0)]],
        td: [0, [Validators.required, Validators.min(0)]],
        tp: [0, [Validators.required, Validators.min(0)]],
        coursTD: [0, [Validators.required, Validators.min(0)]],
        tpTD: [0, [Validators.required, Validators.min(0)]],
        totalTD: [0, [Validators.required, Validators.min(0)]],
      }),
      commentaireChef: [""],
    })
  }

  ngOnInit(): void {
    this.loadData()
  }

  // Méthodes d'initialisation
  loadData(): void {
    this.isLoading = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      departements: this.departementsService.getDepartements(),
      specialites: this.specialitesService.getAllSpecialites(),
      niveaux: this.niveauxService.getNiveaux(),
      matieres: this.coursService.getCours(),
      enseignants: this.enseignantService.getAllEnseignants(),
      voeux: this.voeuxService.getAllVoeux(),
      stats: this.voeuxService.getVoeuxStats(),
    }).subscribe({
      next: (results) => {
        this.departements = results.departements
        this.specialites = results.specialites
        this.niveaux = results.niveaux
        this.matieres = results.matieres
        this.enseignants = results.enseignants
        this.filteredMatieres = [...this.matieres]
        this.filteredEnseignants = [...this.enseignants]
        this.voeuxList = results.voeux
        this.filteredVoeuxList = [...this.voeuxList]
        this.stats = results.stats

        // Charger les groupes
        this.loadGroupes()

        this.updatePagination()
        this.isLoading = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des données:", error)
        this.isLoading = false
      },
    })
  }

  loadGroupes(): void {
    // Simuler le chargement des groupes (à remplacer par un appel API réel)
    this.groupes = [
      { id: "grp1", nom: "Groupe A" },
      { id: "grp2", nom: "Groupe B" },
      { id: "grp3", nom: "Groupe C" },
    ]

    this.sousGroupes = {
      grp1: [
        { id: "sg1", nom: "Sous-groupe A1" },
        { id: "sg2", nom: "Sous-groupe A2" },
      ],
      grp2: [
        { id: "sg3", nom: "Sous-groupe B1" },
        { id: "sg4", nom: "Sous-groupe B2" },
      ],
      grp3: [
        { id: "sg5", nom: "Sous-groupe C1" },
        { id: "sg6", nom: "Sous-groupe C2" },
      ],
    }
  }

  // Méthodes de filtrage
  filterVoeux(): void {
    this.filteredVoeuxList = this.voeuxList.filter((voeu) => {
      // Recherche textuelle
      const searchMatch =
        !this.searchTerm ||
        voeu.enseignantNom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getMatieresNames(voeu.matieres).toLowerCase().includes(this.searchTerm.toLowerCase())

      // Filtres
      const departementMatch = !this.filterDepartement || voeu.departement === this.filterDepartement
      const specialiteMatch = !this.filterSpecialite || voeu.specialite === this.filterSpecialite
      const semestreMatch = !this.filterSemestre || voeu.semestre === this.filterSemestre
      const statusMatch = !this.filterStatus || voeu.status === this.filterStatus

      // Filtre par type de séance
      const typeSeanceMatch =
        this.filterTypesSeance === "tous" || (voeu.typesSeance && voeu.typesSeance.includes(this.filterTypesSeance))

      return searchMatch && departementMatch && specialiteMatch && semestreMatch && statusMatch && typeSeanceMatch
    })

    this.sortVoeux()
    this.updatePagination()
  }

  sortVoeux(): void {
    switch (this.sortBy) {
      case "date-desc":
        this.filteredVoeuxList.sort((a, b) => {
          const dateA = a.dateCreation ? new Date(a.dateCreation).getTime() : 0
          const dateB = b.dateCreation ? new Date(b.dateCreation).getTime() : 0
          return dateB - dateA
        })
        break
      case "date-asc":
        this.filteredVoeuxList.sort((a, b) => {
          const dateA = a.dateCreation ? new Date(a.dateCreation).getTime() : 0
          const dateB = b.dateCreation ? new Date(b.dateCreation).getTime() : 0
          return dateA - dateB
        })
        break
      case "enseignant":
        this.filteredVoeuxList.sort((a, b) => a.enseignantNom.localeCompare(b.enseignantNom))
        break
      case "status":
        this.filteredVoeuxList.sort((a, b) => a.status.localeCompare(b.status))
        break
    }
  }

  resetFilters(): void {
    this.searchTerm = ""
    this.filterDepartement = ""
    this.filterSpecialite = ""
    this.filterSemestre = ""
    this.filterStatus = ""
    this.filterTypesSeance = "tous"
    this.filterVoeux()
  }

  clearSearch(): void {
    this.searchTerm = ""
    this.filterVoeux()
  }

  removeFilter(filter: string): void {
    switch (filter) {
      case "departement":
        this.filterDepartement = ""
        break
      case "specialite":
        this.filterSpecialite = ""
        break
      case "semestre":
        this.filterSemestre = ""
        break
      case "status":
        this.filterStatus = ""
        break
      case "typesSeance":
        this.filterTypesSeance = "tous"
        break
    }
    this.filterVoeux()
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filterDepartement ||
      this.filterSpecialite ||
      this.filterSemestre ||
      this.filterStatus ||
      this.filterTypesSeance !== "tous"
    )
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters
  }

  // Pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredVoeuxList.length / this.itemsPerPage)
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = []
    const maxVisiblePages = 5

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Toujours afficher la première page
      pages.push(1)

      // Calculer les pages du milieu
      let startPage = Math.max(2, this.currentPage - 1)
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 1)

      // Ajuster si on est proche du début ou de la fin
      if (this.currentPage <= 2) {
        endPage = 3
      } else if (this.currentPage >= this.totalPages - 1) {
        startPage = this.totalPages - 2
      }

      // Ajouter un ellipsis si nécessaire
      if (startPage > 2) {
        pages.push(-1) // -1 représente l'ellipsis
      }

      // Ajouter les pages du milieu
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Ajouter un ellipsis si nécessaire
      if (endPage < this.totalPages - 1) {
        pages.push(-2) // -2 représente l'ellipsis
      }

      // Toujours afficher la dernière page
      pages.push(this.totalPages)
    }

    return pages
  }

  // Méthodes pour le modal d'assignation
  openAssignationModal(voeu: Voeux): void {
    this.showAssignationModal = true
    this.currentStep = 1
    this.selectedVoeu = voeu

    // Réinitialiser le formulaire avec uniquement l'enseignant qui a envoyé la demande
    this.assignationForm.reset({
      enseignantId: voeu.enseignantId,
      chargeHoraire: {
        cours: 0,
        td: 0,
        tp: 0,
        coursTD: 0,
        tpTD: 0,
        totalTD: 0,
      },
    })

    // Récupérer l'enseignant spécifique qui a fait la demande depuis les données déjà chargées
    const enseignant = this.enseignants.find((e) => e._id === voeu.enseignantId)

    if (enseignant) {
      // Filtrer pour n'avoir que cet enseignant dans la liste
      this.filteredEnseignants = [enseignant]
    } else {
      console.warn("Enseignant non trouvé dans les données chargées:", voeu.enseignantId)
      // Garder tous les enseignants si celui demandé n'est pas trouvé
      this.filteredEnseignants = [...this.enseignants]
    }

    // Filtrer les matières pour n'avoir que celles demandées dans le voeu
    this.filteredMatieres = this.matieres.filter((matiere) => voeu.matieres.includes(matiere._id))

    // Initialiser les matières avec uniquement celles demandées dans le voeu
    this.resetMatieresArray()
    voeu.matieres.forEach((matiereId: string, index: number) => {
      if (index === 0) {
        // Mettre à jour le premier groupe existant
        this.matieresFormArray.at(0).patchValue({
          id: matiereId,
          typeCours: voeu.typesSeance.includes("cours"),
          typeTD: voeu.typesSeance.includes("td"),
          typeTP: voeu.typesSeance.includes("tp"),
        })
      } else {
        // Ajouter de nouveaux groupes pour les matières supplémentaires
        const newMatiere = this.createMatiereFormGroup()
        newMatiere.patchValue({
          id: matiereId,
          typeCours: voeu.typesSeance.includes("cours"),
          typeTD: voeu.typesSeance.includes("td"),
          typeTP: voeu.typesSeance.includes("tp"),
        })
        this.matieresFormArray.push(newMatiere)
      }
    })

    // Initialiser les groupes
    this.resetGroupesArray()

    // Si le voeu a déjà une charge horaire, l'utiliser
    if (voeu.chargeHoraire) {
      this.assignationForm.get("chargeHoraire")?.patchValue({
        cours: voeu.chargeHoraire.cours || 0,
        td: voeu.chargeHoraire.td || 0,
        tp: voeu.chargeHoraire.tp || 0,
        coursTD: voeu.chargeHoraire.coursTD || 0,
        tpTD: voeu.chargeHoraire.tpTD || 0,
        totalTD: voeu.chargeHoraire.totalTD || 0,
      })
    } else {
      // Calculer automatiquement la charge horaire initiale
      this.calculateTotalHours()
    }
  }

  closeAssignationModal(): void {
    this.showAssignationModal = false
    this.selectedVoeu = null
  }

  filterDataForVoeu(voeu: Voeux): void {
    // Cette méthode n'est plus utilisée car nous récupérons directement l'enseignant et les matières spécifiques
    // dans la méthode openAssignationModal
  }

  // Navigation par étapes
  nextStep(): void {
    if (this.isStepValid(this.currentStep) && this.currentStep < 3) {
      this.currentStep++
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        const enseignantValid = this.assignationForm.get("enseignantId")?.valid === true
        const matieresValid =
          this.matieresFormArray.length > 0 &&
          this.matieresFormArray.controls.every((control) => {
            const idValid = control.get("id")?.valid === true
            const index = this.matieresFormArray.controls.indexOf(control)
            return idValid && this.hasTypeSelected(index)
          })
        return enseignantValid && matieresValid
      case 2:
        return (
          this.groupesFormArray.length > 0 &&
          this.groupesFormArray.controls.every((control) => control.get("groupeId")?.valid === true)
        )
      default:
        return true
    }
  }

  // Gestion des matières
  get matieresFormArray(): FormArray {
    return this.assignationForm.get("matieres") as FormArray
  }

  createMatiereFormGroup(): FormGroup {
    return this.fb.group({
      id: ["", Validators.required],
      typeCours: [false],
      typeTD: [false],
      typeTP: [false],
    })
  }

  addNewMatiere(): void {
    this.matieresFormArray.push(this.createMatiereFormGroup())
  }

  removeMatiere(index: number): void {
    this.matieresFormArray.removeAt(index)
  }

  resetMatieresArray(): void {
    while (this.matieresFormArray.length > 0) {
      this.matieresFormArray.removeAt(0)
    }
    this.matieresFormArray.push(this.createMatiereFormGroup())
  }

  updateMatiereTitle(index: number, event: any): void {
    // Logique pour mettre à jour le titre de la matière si nécessaire
    console.log(`Matière ${index} mise à jour:`, event.target.value)
  }

  hasTypeSelected(index: number): boolean {
    const control = this.matieresFormArray.at(index)
    return control.get("typeCours")?.value || control.get("typeTD")?.value || control.get("typeTP")?.value
  }

  // Gestion des groupes
  get groupesFormArray(): FormArray {
    return this.assignationForm.get("groupes") as FormArray
  }

  createGroupeFormGroup(): FormGroup {
    return this.fb.group({
      groupeId: ["", Validators.required],
      sousGroupeId: [""],
    })
  }

  addNewGroupe(): void {
    this.groupesFormArray.push(this.createGroupeFormGroup())
  }

  removeGroupe(index: number): void {
    this.groupesFormArray.removeAt(index)
  }

  resetGroupesArray(): void {
    while (this.groupesFormArray.length > 0) {
      this.groupesFormArray.removeAt(0)
    }
    this.groupesFormArray.push(this.createGroupeFormGroup())
  }

  updateSousGroupes(index: number, event: any): void {
    const groupeId = event.target.value
    // La logique pour mettre à jour les sous-groupes est déjà gérée par le binding
  }

  getSousGroupes(index: number): any[] {
    const groupeId = this.groupesFormArray.at(index).get("groupeId")?.value
    return this.sousGroupes[groupeId] || []
  }

  // Gestion de la charge horaire
  calculateTotalHours(): void {
    if (!this.selectedVoeu) return

    // Récupérer l'enseignant sélectionné pour obtenir son grade
    const enseignantId = this.assignationForm.get("enseignantId")?.value
    const enseignant = this.enseignants.find((e) => e._id === enseignantId)

    if (!enseignant) {
      console.error("Enseignant non trouvé")
      return
    }

    // Calculer la charge horaire en fonction des matières et types de séance sélectionnés
    let coursHours = 0
    let tdHours = 0
    let tpHours = 0

    // Pour chaque matière sélectionnée
    this.matieresFormArray.controls.forEach((control) => {
      const matiereId = control.get("id")?.value
      const matiere = this.matieres.find((m) => m._id === matiereId)

      if (matiere) {
        const heures = matiere.heure || Number.parseInt(matiere.heures || "0")

        // Multiplier par le nombre de groupes
        const nbGroupes = this.groupesFormArray.length

        if (control.get("typeCours")?.value) {
          coursHours += heures
        }

        if (control.get("typeTD")?.value) {
          tdHours += heures * nbGroupes
        }

        if (control.get("typeTP")?.value) {
          tpHours += heures * nbGroupes
        }
      }
    })

    // Calculer les équivalents TD en utilisant le service enseignant
    const chargeHoraire = this.enseignantService.calculerChargeHoraire(
      enseignant.grade || "Maitre Assistant",
      coursHours,
      tdHours,
      tpHours,
    )

    // Mettre à jour le formulaire avec les valeurs calculées
    this.assignationForm.get("chargeHoraire")?.patchValue({
      cours: coursHours,
      td: tdHours,
      tp: tpHours,
      coursTD: chargeHoraire.conversion.coursTD,
      tpTD: chargeHoraire.conversion.tpTD,
      totalTD: chargeHoraire.conversion.totalTD,
    })
  }

  // Méthodes utilitaires
  getMatieresNames(matiereIds: string[]): string {
    if (!matiereIds || matiereIds.length === 0) return ""

    return matiereIds
      .map((id) => {
        const matiere = this.matieres.find((m) => m._id === id)
        return matiere ? matiere.titre : id
      })
      .join(", ")
  }

  getDepartementName(departementId: string): string {
    const departement = this.departements.find((d) => d._id === departementId)
    return departement ? departement.nom || departement.name : departementId
  }

  getSpecialiteName(specialiteId: string): string {
    const specialite = this.specialites.find((s) => s._id === specialiteId)
    return specialite ? specialite.nom || specialite.name : specialiteId
  }

  getNiveauName(niveauId: string): string {
    const niveau = this.niveaux.find((n) => n._id === niveauId)
    return niveau ? niveau.nom || niveau.name : niveauId
  }

  getMatiereName(matiereId: string): string {
    const matiere = this.matieres.find((m) => m._id === matiereId)
    return matiere ? matiere.titre : matiereId
  }

  getTypesSeanceText(types: string[]): string {
    if (!types || types.length === 0) return "Aucun"

    const typeLabels: { [key: string]: string } = {
      cours: "Cours",
      td: "TD",
      tp: "TP",
    }

    return types.map((type) => typeLabels[type] || type).join(", ")
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return ""
    const d = new Date(date)
    return d.toLocaleDateString("fr-FR")
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "approved":
        return "success"
      case "pending":
        return "warning"
      case "rejected":
        return "danger"
      default:
        return ""
    }
  }

  getStatusClass(status: string): string {
    return status || ""
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case "approved":
        return "Approuvé"
      case "pending":
        return "En attente"
      case "rejected":
        return "Rejeté"
      default:
        return status
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "approved":
        return "fas fa-check-circle"
      case "pending":
        return "fas fa-clock"
      case "rejected":
        return "fas fa-times-circle"
      default:
        return "fas fa-question-circle"
    }
  }

  getAvatarColor(name: string): string {
    // Générer une couleur basée sur le nom
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = hash % 360
    return `hsl(${hue}, 70%, 60%)`
  }

  viewVoeuDetails(voeu: Voeux): void {
    // Implémenter la logique pour afficher les détails du voeu
    console.log("Afficher les détails du voeu:", voeu)
    // Ici, vous pourriez ouvrir un modal de détails ou naviguer vers une page de détails
  }

  rejectVoeu(voeu: Voeux): void {
    if (confirm("Êtes-vous sûr de vouloir rejeter ce voeu ?")) {
      this.isLoading = true

      const updateData = {
        status: "rejected" as const,
        commentaireChef: "Voeu rejeté par le chef de département.",
      }

      this.voeuxService.updateVoeuxStatus(voeu._id || "", updateData).subscribe({
        next: (updatedVoeu) => {
          // Mettre à jour le voeu dans la liste
          const index = this.voeuxList.findIndex((v) => v._id === voeu._id)
          if (index !== -1) {
            this.voeuxList[index] = updatedVoeu
          }

          // Mettre à jour les statistiques
          this.stats.rejected++
          this.stats.pending--

          // Rafraîchir la liste filtrée
          this.filterVoeux()
          this.isLoading = false

          alert("Le voeu a été rejeté avec succès.")
        },
        error: (error) => {
          console.error("Erreur lors du rejet du voeu:", error)
          this.isLoading = false
          alert("Une erreur est survenue lors du rejet du voeu.")
        },
      })
    }
  }

  openNewAssignationModal(): void {
    // Ouvrir le modal pour une nouvelle assignation
    this.showAssignationModal = true
    this.currentStep = 1
    this.selectedVoeu = null

    this.assignationForm.reset({
      chargeHoraire: {
        cours: 0,
        td: 0,
        tp: 0,
        coursTD: 0,
        tpTD: 0,
        totalTD: 0,
      },
    })

    this.resetMatieresArray()
    this.resetGroupesArray()

    // Utiliser toutes les matières et tous les enseignants
    this.filteredMatieres = [...this.matieres]
    this.filteredEnseignants = [...this.enseignants]
  }

  getTotalHours(type?: string): number {
    if (!this.assignationForm) return 0

    const chargeHoraire = this.assignationForm.get("chargeHoraire")?.value
    if (!chargeHoraire) return 0

    if (type) {
      return chargeHoraire[type] || 0
    }

    return chargeHoraire.totalTD || 0
  }

  submitAssignation(): void {
    if (this.assignationForm.valid) {
      this.isLoading = true

      const formValue = this.assignationForm.value

      // Préparer les données pour la mise à jour du voeu
      const updateData = {
        status: "approved" as const,
        commentaireChef: formValue.commentaireChef,
        matieres: formValue.matieres.map((m: any) => m.id),
        groupes: formValue.groupes,
        chargeHoraire: formValue.chargeHoraire,
      }

      if (this.selectedVoeu && this.selectedVoeu._id) {
        // Mettre à jour un voeu existant
        this.voeuxService.updateVoeuxStatus(this.selectedVoeu._id, updateData).subscribe({
          next: (updatedVoeu) => {
            // Mettre à jour le voeu dans la liste
            const index = this.voeuxList.findIndex((v) => v._id === this.selectedVoeu?._id)
            if (index !== -1) {
              this.voeuxList[index] = updatedVoeu
            }

            // Mettre à jour les statistiques
            this.stats.approved++
            this.stats.pending--

            // Rafraîchir la liste filtrée
            this.filterVoeux()
            this.isLoading = false
            this.closeAssignationModal()

            alert("L'assignation a été effectuée avec succès.")
          },
          error: (error) => {
            console.error("Erreur lors de l'assignation:", error)
            this.isLoading = false
            alert("Une erreur est survenue lors de l'assignation.")
          },
        })
      } else {
        // Créer une nouvelle assignation
        const enseignant = this.enseignants.find((e) => e._id === formValue.enseignantId)

        // Déterminer la spécialité et le niveau en fonction de la première matière sélectionnée
        const premiereMatiere = this.matieres.find((m) => m._id === formValue.matieres[0]?.id)

        const newVoeu = {
          enseignantId: formValue.enseignantId,
          enseignantNom: enseignant ? `${enseignant.nom} ${enseignant.prenom}` : "Enseignant inconnu",
          departement: enseignant ? enseignant.departement : "",
          specialite: premiereMatiere ? premiereMatiere.specialite : "",
          niveau: premiereMatiere ? premiereMatiere.niveau : "",
          semestre: premiereMatiere ? premiereMatiere.semestre?.toString() : "1",
          matieres: formValue.matieres.map((m: any) => m.id),
          typesSeance: this.getSelectedTypesSeance(formValue.matieres),
          nbGroupes: formValue.groupes.length,
          nbFilieres: 1, // À déterminer ou à ajouter au formulaire
          commentaire: "",
          status: "approved" as const,
          commentaireChef: formValue.commentaireChef,
          chargeHoraire: formValue.chargeHoraire,
          dateCreation: new Date(),
        }

        this.voeuxService.createVoeux(newVoeu).subscribe({
          next: (createdVoeu) => {
            // Ajouter le nouveau voeu à la liste
            this.voeuxList.push(createdVoeu)

            // Mettre à jour les statistiques
            this.stats.approved++
            this.stats.total++

            // Rafraîchir la liste filtrée
            this.filterVoeux()
            this.isLoading = false
            this.closeAssignationModal()

            alert("La nouvelle assignation a été créée avec succès.")
          },
          error: (error) => {
            console.error("Erreur lors de la création de l'assignation:", error)
            this.isLoading = false
            alert("Une erreur est survenue lors de la création de l'assignation.")
          },
        })
      }
    }
  }

  getEnseignantName(enseignantId: string): string {
    const enseignant = this.enseignants.find((e) => e._id === enseignantId)
    return enseignant ? `${enseignant.nom} ${enseignant.prenom || ""}`.trim() : ""
  }

  getEnseignantDepartement(enseignantId: string): string {
    const enseignant = this.enseignants.find((e) => e._id === enseignantId)
    return enseignant ? enseignant.departement : ""
  }

  getSelectedTypesSeance(matieres: any[]): string[] {
    const types: string[] = []

    matieres.forEach((matiere) => {
      if (matiere.typeCours && !types.includes("cours")) {
        types.push("cours")
      }
      if (matiere.typeTD && !types.includes("td")) {
        types.push("td")
      }
      if (matiere.typeTP && !types.includes("tp")) {
        types.push("tp")
      }
    })

    return types
  }
}