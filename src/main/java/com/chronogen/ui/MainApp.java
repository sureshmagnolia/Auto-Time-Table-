package com.chronogen.ui;

import atlantafx.base.theme.PrimerDark;
import ai.timefold.solver.core.api.solver.Solver;
import ai.timefold.solver.core.api.solver.SolverFactory;
import ai.timefold.solver.core.config.solver.SolverConfig;
import ai.timefold.solver.core.config.solver.termination.TerminationConfig;
import com.chronogen.model.*;
import com.chronogen.solver.TimetableConstraintProvider;
import com.chronogen.xml.AscXmlParser;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public class MainApp extends Application {

    private TimetableSolution currentSolution;
    private BorderPane mainLayout;

    // View Components
    private Label totalTeachersLabel;
    private Label totalClassesLabel;
    private Label totalSubjectsLabel;
    private Label totalLessonsLabel;

    private ComboBox<Clazz> classSelector;
    private GridPane timetableGrid;
    private Button solveButton;
    private Label solverStatusLabel;

    public static void main(String[] args) {
        launch(args);
    }

    @Override
    public void start(Stage primaryStage) {
        // Apply AtlantaFX Modern Theme
        Application.setUserAgentStylesheet(new PrimerDark().getUserAgentStylesheet());

        primaryStage.setTitle("ChronoGen Standalone Scheduler");

        // Main Sidebar + Content Area layout
        mainLayout = new BorderPane();

        // 1. Sidebar Navigation
        VBox sidebar = createSidebar(primaryStage);
        mainLayout.setLeft(sidebar);

        // 2. Default Dashboard View
        VBox dashboardView = createDashboardView();
        mainLayout.setCenter(dashboardView);

        Scene scene = new Scene(mainLayout, 1000, 700);
        primaryStage.setScene(scene);
        primaryStage.show();

        // Load Default Mock Data so app is usable immediately
        loadMockData();
    }

    private VBox createSidebar(Stage stage) {
        VBox sidebar = new VBox(15);
        sidebar.setPadding(new Insets(30, 20, 30, 20));
        sidebar.setStyle("-fx-background-color: #1a1b26; -fx-border-color: #2f344f; -fx-border-width: 0 1px 0 0;");
        sidebar.setPrefWidth(240);

        Label logoLabel = new Label("ChronoGen");
        logoLabel.setStyle("-fx-font-size: 24px; -fx-font-weight: bold; -fx-text-fill: #7aa2f7;");
        logoLabel.setGraphic(new Label("📅 "));

        Button dashboardBtn = new Button("Dashboard");
        dashboardBtn.setMaxWidth(Double.MAX_VALUE);
        dashboardBtn.setAlignment(Pos.BASELINE_LEFT);

        Button viewerBtn = new Button("Timetable Grid");
        viewerBtn.setMaxWidth(Double.MAX_VALUE);
        viewerBtn.setAlignment(Pos.BASELINE_LEFT);

        Button importXmlBtn = new Button("Import aSc XML");
        importXmlBtn.setMaxWidth(Double.MAX_VALUE);
        importXmlBtn.setAlignment(Pos.BASELINE_LEFT);
        importXmlBtn.setStyle("-fx-background-color: #bb9afc; -fx-text-fill: #1a1b26; -fx-font-weight: bold;");

        // Tab Switching Actions
        dashboardBtn.setOnAction(e -> mainLayout.setCenter(createDashboardView()));
        viewerBtn.setOnAction(e -> mainLayout.setCenter(createTimetableView()));
        importXmlBtn.setOnAction(e -> triggerXmlImport(stage));

        sidebar.getChildren().addAll(logoLabel, new Separator(), dashboardBtn, viewerBtn, new Separator(), importXmlBtn);
        return sidebar;
    }

    private VBox createDashboardView() {
        VBox root = new VBox(25);
        root.setPadding(new Insets(40));

        Label title = new Label("Dashboard");
        title.setStyle("-fx-font-size: 28px; -fx-font-weight: bold;");

        Label subtitle = new Label("Welcome to ChronoGen Timetable Studio.");
        subtitle.setStyle("-fx-text-fill: #a9b1d6;");

        // Stats grid
        GridPane statsGrid = new GridPane();
        statsGrid.setHgap(20);
        statsGrid.setVgap(20);

        totalTeachersLabel = createStatCard(statsGrid, "Teachers", "0", 0, 0, "#7aa2f7");
        totalClassesLabel = createStatCard(statsGrid, "Classes", "0", 0, 1, "#bb9afc");
        totalSubjectsLabel = createStatCard(statsGrid, "Subjects", "0", 1, 0, "#f7768e");
        totalLessonsLabel = createStatCard(statsGrid, "Lessons", "0", 1, 1, "#73daca");

        root.getChildren().addAll(title, subtitle, statsGrid);
        updateDashboardStats();
        return root;
    }

    private Label createStatCard(GridPane grid, String title, String value, int col, int row, String colorHex) {
        VBox card = new VBox(10);
        card.setPadding(new Insets(20));
        card.setPrefSize(180, 120);
        card.setStyle("-fx-background-color: #1e1e2e; -fx-background-radius: 8px; -fx-border-color: " + colorHex + "; -fx-border-width: 1px;");

        Label titleLabel = new Label(title);
        titleLabel.setStyle("-fx-text-fill: #c0caf5; -fx-font-size: 14px;");

        Label valLabel = new Label(value);
        valLabel.setStyle("-fx-font-size: 28px; -fx-font-weight: bold; -fx-text-fill: " + colorHex + ";");

        card.getChildren().addAll(titleLabel, valLabel);
        grid.add(card, col, row);
        return valLabel;
    }

    private VBox createTimetableView() {
        VBox root = new VBox(20);
        root.setPadding(new Insets(30));

        Label title = new Label("Timetable Grid");
        title.setStyle("-fx-font-size: 24px; -fx-font-weight: bold;");

        HBox controls = new HBox(15);
        controls.setAlignment(Pos.CENTER_LEFT);

        Label selectLabel = new Label("Class:");
        classSelector = new ComboBox<>();
        classSelector.setPromptText("Select class...");
        if (currentSolution != null && currentSolution.getClasses() != null) {
            classSelector.setItems(FXCollections.observableArrayList(currentSolution.getClasses()));
            if (!currentSolution.getClasses().isEmpty()) {
                classSelector.setValue(currentSolution.getClasses().get(0));
            }
        }
        classSelector.setOnAction(e -> renderTimetableGrid());

        solveButton = new Button("Solve timetable (AI)");
        solveButton.setStyle("-fx-background-color: #73daca; -fx-text-fill: #1a1b26; -fx-font-weight: bold;");
        solveButton.setOnAction(e -> runSolver());

        solverStatusLabel = new Label("Ready to solve.");
        solverStatusLabel.setStyle("-fx-text-fill: #a9b1d6;");

        controls.getChildren().addAll(selectLabel, classSelector, solveButton, solverStatusLabel);

        timetableGrid = new GridPane();
        timetableGrid.setHgap(8);
        timetableGrid.setVgap(8);
        timetableGrid.setStyle("-fx-background-color: #1a1b26; -fx-padding: 10px; -fx-background-radius: 8px;");

        root.getChildren().addAll(title, controls, timetableGrid);
        renderTimetableGrid();
        return root;
    }

    private void renderTimetableGrid() {
        if (timetableGrid == null) return;
        timetableGrid.getChildren().clear();

        Clazz selectedClass = classSelector != null ? classSelector.getValue() : null;
        if (selectedClass == null || currentSolution == null) {
            timetableGrid.add(new Label("Please load data and select a class."), 0, 0);
            return;
        }

        List<Day> days = currentSolution.getDays();
        List<Period> periods = currentSolution.getPeriods();

        // 1. Column headers (Periods)
        for (int pIdx = 0; pIdx < periods.size(); pIdx++) {
            Label header = new Label("Period " + periods.get(pIdx).number());
            header.setStyle("-fx-font-weight: bold; -fx-text-fill: #7aa2f7;");
            header.setPrefSize(140, 30);
            header.setAlignment(Pos.CENTER);
            timetableGrid.add(header, pIdx + 1, 0);
        }

        // 2. Rows (Days)
        for (int dIdx = 0; dIdx < days.size(); dIdx++) {
            Day day = days.get(dIdx);
            Label dayLabel = new Label(day.name());
            dayLabel.setStyle("-fx-font-weight: bold; -fx-text-fill: #7aa2f7;");
            dayLabel.setPrefSize(80, 60);
            dayLabel.setAlignment(Pos.CENTER);
            timetableGrid.add(dayLabel, 0, dIdx + 1);

            for (int pIdx = 0; pIdx < periods.size(); pIdx++) {
                Period period = periods.get(pIdx);

                // Find card in this slot for selected class
                LessonAssignment card = null;
                for (LessonAssignment la : currentSolution.getAssignments()) {
                    if (la.getDay() != null && la.getDay().equals(day) &&
                        la.getPeriod() != null && la.getPeriod().equals(period) &&
                        la.getLesson().clazz().id().equals(selectedClass.id())) {
                        card = la;
                        break;
                    }
                }

                VBox cell = new VBox(5);
                cell.setPrefSize(140, 60);
                cell.setAlignment(Pos.CENTER);
                cell.setPadding(new Insets(5));

                if (card != null) {
                    Label subjectLabel = new Label(card.getLesson().subject().shortName());
                    subjectLabel.setStyle("-fx-font-weight: bold; -fx-text-fill: #ffffff; -fx-font-size: 14px;");

                    String teacherNames = card.getLesson().teachers().isEmpty() ? "" : card.getLesson().teachers().get(0).teacher().shortName();
                    Label tLabel = new Label(teacherNames);
                    tLabel.setStyle("-fx-text-fill: #c0caf5; -fx-font-size: 11px;");

                    cell.getChildren().addAll(subjectLabel, tLabel);

                    // Locked card coloring
                    if (card.isLocked()) {
                        cell.setStyle("-fx-background-color: #3b4252; -fx-background-radius: 4px; -fx-border-color: #f7768e; -fx-border-width: 1px;");
                    } else {
                        cell.setStyle("-fx-background-color: #24283b; -fx-background-radius: 4px;");
                    }

                    // Context Menu for locking/unlocking card
                    ContextMenu menu = new ContextMenu();
                    MenuItem lockItem = new MenuItem(card.isLocked() ? "Unlock Card" : "Lock Card");
                    LessonAssignment finalCard = card;
                    lockItem.setOnAction(e -> {
                        finalCard.setLocked(!finalCard.isLocked());
                        renderTimetableGrid();
                    });
                    menu.getItems().add(lockItem);
                    cell.setOnContextMenuRequested(e -> menu.show(cell, e.getScreenX(), e.getScreenY()));

                } else {
                    cell.setStyle("-fx-background-color: #16161e; -fx-background-radius: 4px; -fx-opacity: 0.3;");
                }

                timetableGrid.add(cell, pIdx + 1, dIdx + 1);
            }
        }
    }

    private void runSolver() {
        if (currentSolution == null) return;

        solveButton.setDisable(true);
        solverStatusLabel.setText("Solving schedule...");

        // Configure solver programmatically
        SolverConfig solverConfig = new SolverConfig()
                .withSolutionClass(TimetableSolution.class)
                .withEntityClasses(LessonAssignment.class)
                .withConstraintProviderClass(TimetableConstraintProvider.class)
                .withTerminationConfig(new TerminationConfig()
                        .withSpentLimit(Duration.ofSeconds(5)));

        SolverFactory<TimetableSolution> solverFactory = SolverFactory.create(solverConfig);
        Solver<TimetableSolution> solver = solverFactory.buildSolver();

        CompletableFuture.supplyAsync(() -> solver.solve(currentSolution))
                .thenAccept(solution -> Platform.runLater(() -> {
                    currentSolution = solution;
                    solveButton.setDisable(false);
                    solverStatusLabel.setText("Solved successfully! Score: " + solution.getScore());
                    renderTimetableGrid();
                }))
                .exceptionally(ex -> {
                    Platform.runLater(() -> {
                        solveButton.setDisable(false);
                        solverStatusLabel.setText("Error occurred during solve.");
                        ex.printStackTrace();
                    });
                    return null;
                });
    }

    private void triggerXmlImport(Stage stage) {
        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Open aSc XML timetable file");
        fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("XML Files", "*.xml"));
        File file = fileChooser.showOpenDialog(stage);

        if (file != null) {
            try {
                String xmlContent = Files.readString(file.toPath());
                currentSolution = AscXmlParser.parse(xmlContent);

                Alert alert = new Alert(Alert.AlertType.INFORMATION);
                alert.setTitle("Import Success");
                alert.setHeaderText("XML Timetable Loaded");
                alert.setContentText("Found " + currentSolution.getTeachers().size() + " teachers and " + currentSolution.getAssignments().size() + " planning lesson periods.");
                alert.showAndWait();

                mainLayout.setCenter(createDashboardView());

            } catch (Exception e) {
                Alert alert = new Alert(Alert.AlertType.ERROR);
                alert.setTitle("Import Error");
                alert.setHeaderText("Failed to parse aSc XML");
                alert.setContentText(e.getMessage());
                alert.showAndWait();
                e.printStackTrace();
            }
        }
    }

    private void updateDashboardStats() {
        if (currentSolution == null) return;
        if (totalTeachersLabel != null) totalTeachersLabel.setText(String.valueOf(currentSolution.getTeachers().size()));
        if (totalClassesLabel != null) totalClassesLabel.setText(String.valueOf(currentSolution.getClasses().size()));
        if (totalSubjectsLabel != null) totalSubjectsLabel.setText(String.valueOf(currentSolution.getSubjects().size()));
        if (totalLessonsLabel != null) totalLessonsLabel.setText(String.valueOf(currentSolution.getAssignments().size()));
    }

    private void loadMockData() {
        try {
            String mockXml = """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <timetable>
                      <teachers>
                        <teacher id="T1" name="Alice" short="AL"/>
                        <teacher id="T2" name="Bob" short="BO"/>
                      </teachers>
                      <subjects>
                        <subject id="S1" name="Mathematics" short="MA"/>
                        <subject id="S2" name="Science" short="SC"/>
                      </subjects>
                      <classes>
                        <class id="C1" name="Grade 10A" short="10A"/>
                        <class id="C2" name="Grade 10B" short="10B"/>
                      </classes>
                      <classrooms>
                        <classroom id="R1" name="Room 101" short="101"/>
                      </classrooms>
                      <lessons>
                        <lesson id="L1" teacherids="T1" subjectid="S1" classids="C1" periodsperweek="3"/>
                        <lesson id="L2" teacherids="T2" subjectid="S2" classids="C1" periodsperweek="2"/>
                        <lesson id="L3" teacherids="T1" subjectid="S1" classids="C2" periodsperweek="2"/>
                        <lesson id="L4" teacherids="T2" subjectid="S2" classids="C2" periodsperweek="3"/>
                      </lessons>
                      <cards>
                      </cards>
                    </timetable>
                    """;
            currentSolution = AscXmlParser.parse(mockXml);
            updateDashboardStats();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
