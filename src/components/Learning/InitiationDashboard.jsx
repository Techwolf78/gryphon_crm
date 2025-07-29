import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  School,
  CheckCircle,
  Pending,
  PlayCircle,
  FilterList,
} from "@mui/icons-material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase"; // Import your Firebase configuration

const statusConfig = {
  active: { color: "#4CAF50", icon: <PlayCircle fontSize="small" /> },
  upcoming: { color: "#2196F3", icon: <Pending fontSize="small" /> },
  completed: { color: "#9E9E9E", icon: <CheckCircle fontSize="small" /> },
};

const TrainingDashboard = () => {
  const [value, setValue] = useState(0);
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchTrainingData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "trainingForms"));
        const data = [];
        
        for (const doc of querySnapshot.docs) {
          const trainingForm = doc.data();
          const trainingsSnapshot = await getDocs(collection(db, `trainingForms/${doc.id}/trainings`));
          const phases = [];
          
          trainingsSnapshot.forEach(phaseDoc => {
            phases.push({
              id: phaseDoc.id,
              ...phaseDoc.data()
            });
          });
          
          data.push({
            id: doc.id,
            ...trainingForm,
            phases
          });
        }
        
        setTrainingData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching training data:", error);
        setLoading(false);
      }
    };
    
    fetchTrainingData();
  }, []);

  const phaseData = [
    {
      id: 1,
      name: "Initiation",
      status: "active",
      colleges: trainingData.map(training => ({
        id: training.collegeCode || training.id,
        name: training.collegeName || "Unknown College",
        students: training.studentCount || 0,
        progress: calculateProgress(training), // You'll need to implement this
        contact: training.tpoEmail || training.accountEmail || "No contact",
        joinedDate: training.contractStartDate || "N/A",
        completedDate: training.contractEndDate || "N/A",
        details: training // Store all details for potential expansion
      }))
    },
    {
      id: 2,
      name: "TP - I",
      status: "upcoming",
      colleges: [] // You can add logic to filter upcoming trainings
    },
    {
      id: 3,
      name: "TP - II",
      status: "upcoming",
      colleges: []
    },
    {
      id: 4,
      name: "TP - III",
      status: "upcoming",
      colleges: []
    },
    {
      id: 5,
      name: "Closed",
      status: "completed",
      colleges: [] // You can add logic to filter completed trainings
    }
  ];

  function calculateProgress(training) {
    // Implement your progress calculation logic here
    // For example, based on training dates or phase completion
    return 35; // Default value for now
  }

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const currentPhase = phaseData[value];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f8f9fa", p: isMobile ? 1 : 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            College Training Program
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Manage training phases and participating colleges
          </Typography>
        </Box>
      </Box>

      {/* Phase Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: theme.shadows[1] }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": { height: 3, backgroundColor: theme.palette.primary.main },
          }}
        >
          {phaseData.map((phase) => (
            <Tab
              key={phase.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {statusConfig[phase.status].icon}
                  <span>{phase.name}</span>
                  {phase.colleges.length > 0 && (
                    <Chip
                      label={phase.colleges.length}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        backgroundColor: `${statusConfig[phase.status].color}20`,
                        color: statusConfig[phase.status].color,
                      }}
                    />
                  )}
                </Box>
              }
              sx={{ minHeight: 48, fontSize: "0.875rem", fontWeight: 500, textTransform: "none" }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Phase Content */}
      <Paper sx={{ borderRadius: 2, boxShadow: theme.shadows[1], overflow: "hidden" }}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: `${statusConfig[currentPhase.status].color}08`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {currentPhase.name} Phase
            <Chip
              label={currentPhase.status}
              size="small"
              sx={{
                ml: 1.5,
                backgroundColor: `${statusConfig[currentPhase.status].color}20`,
                color: statusConfig[currentPhase.status].color,
                textTransform: "capitalize",
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          </Typography>
          <Tooltip title="Filter">
            <IconButton size="small">
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {currentPhase.colleges.length > 0 ? (
          <TableContainer>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                  <TableCell sx={{ fontWeight: 600 }}>College</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {currentPhase.status === "completed" ? "Completed Date" : "Joined Date"}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPhase.colleges.map((college) => (
                  <TableRow key={college.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: `${theme.palette.primary.main}20`,
                            color: theme.palette.primary.main,
                          }}
                        >
                          <School fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">{college.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{college.students}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <LinearProgress
                        variant="determinate"
                        value={college.progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: theme.palette.grey[200],
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: statusConfig[currentPhase.status].color,
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                        {college.progress}% complete
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {college.contact}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {currentPhase.status === "completed" ? college.completedDate : college.joinedDate}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: "center", color: theme.palette.text.secondary }}>
            <School sx={{ fontSize: 48, mb: 1, color: theme.palette.grey[400] }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              No colleges in this phase
            </Typography>
            <Typography variant="body2">
              Colleges will appear here once they join this training phase
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TrainingDashboard;