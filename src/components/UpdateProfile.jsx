import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { FaUserCircle, FaEdit, FaSpinner, FaArrowLeft } from "react-icons/fa";
const defaultAvatar = '/home/profile5.jpg';
import ProfilePictureModal from "./ProfilePictureModal";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const avatars = [
  "/home/profile1.png",
  "/home/profile2.jpg",
  "/home/profile3.jpg",
  "/home/profile4.jpg",
  "/home/profile6.png",
  "/home/profile7.jpg",
  "/home/profile10.jpg",
];

export default function UpdateProfile({ onClose }) {
  const { user, setPhotoURL, photoURL } = useContext(AuthContext);
  const { instance, accounts } = useMsal();
  const [currentImage, setCurrentImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); // New state for upload progress
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [lastLogin, setLastLogin] = useState(null);
  const [microsoftConnectionStatus, setMicrosoftConnectionStatus] = useState('checking');
  const [microsoftConnectionMessage, setMicrosoftConnectionMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const formatDisplayName = (email) => {
    const domain = "@gryphonacademy.co.in";
    if (email.endsWith(domain)) {
      const namePart = email.split("@")[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return email;
  };

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          setLoading(true);
          // Fetch profile data
          const profileRef = doc(db, "userprofile", user.uid);
          const profileSnap = await getDoc(profileRef);

          // Fetch user details
          const usersQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid)
          );
          const usersSnapshot = await getDocs(usersQuery);

          // Fetch last login from audit_logs
          const auditLogsQuery = query(
            collection(db, "audit_logs"),
            where("user", "==", user.email),
            where("action", "==", "Logged in"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const auditLogsSnapshot = await getDocs(auditLogsQuery);

          if (!auditLogsSnapshot.empty) {
            const lastLoginData = auditLogsSnapshot.docs[0].data();
            setLastLogin(lastLoginData.timestamp.toDate());
          }

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            setProfileData(data);
            if (data.profilePicUrl) {
              setCurrentImage(data.profilePicUrl);
              setPhotoURL(data.profilePicUrl);
            }
          } else {
            const basicProfile = {
              uid: user.uid,
              email: user.email,
              name: formatDisplayName(user.email),
              createdAt: new Date().toISOString(),
              profilePicUrl: "",
            };
            await setDoc(profileRef, basicProfile);
            setProfileData(basicProfile);
          }

          if (!usersSnapshot.empty) {
            setUserDetails(usersSnapshot.docs[0].data());
          }
        } catch {
          // Error loading profile data - handled through toast
          toast.error("Failed to load profile data");
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [user, setPhotoURL]);

  const handleSaveImage = async (imageUrl) => {
    if (!user || !imageUrl) return;

    try {
      setUploading(true); // Start upload
      const userProfileRef = doc(db, "userprofile", user.uid);
      await setDoc(
        userProfileRef,
        {
          profilePicUrl: imageUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setCurrentImage(imageUrl);
      setPhotoURL(imageUrl);
    } catch {
      // Error updating profile - handled through toast
      toast.error("Failed to update profile picture");
    } finally {
      setUploading(false); // End upload
      setShowUpdateModal(false);
    }
  };

  const testMicrosoftConnection = async () => {
    setTestingConnection(true);
    setMicrosoftConnectionStatus('checking');
    setMicrosoftConnectionMessage('');

    try {
      // Check if user is logged in with Microsoft
      if (!accounts || accounts.length === 0) {
        // No Microsoft account found - trigger login
        setMicrosoftConnectionMessage('Redirecting to Microsoft login...');

        const loginRequest = {
          scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
        };

        try {
          const loginResponse = await instance.loginPopup(loginRequest);
          if (loginResponse && loginResponse.account) {
            // Login successful, now test the connection
            setMicrosoftConnectionMessage('Login successful! Testing connection...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause for UX

            // Test the connection with the newly logged in account
            const tokenRequest = {
              scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
              account: loginResponse.account,
            };

            const tokenResponse = await instance.acquireTokenSilent(tokenRequest);

            if (tokenResponse && tokenResponse.accessToken) {
              // Test Graph API call
              const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                  'Authorization': `Bearer ${tokenResponse.accessToken}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                const userData = await response.json();
                setMicrosoftConnectionStatus('connected');
                setMicrosoftConnectionMessage(`✓ Connected successfully as ${userData.displayName} (${userData.mail})`);
              } else {
                throw new Error(`Graph API error: ${response.status}`);
              }
            } else {
              throw new Error('Failed to acquire access token after login');
            }
          } else {
            throw new Error('Login failed - no account returned');
          }
        } catch (loginError) {
          console.error('Microsoft login failed:', loginError);
          setMicrosoftConnectionStatus('pending');
          setMicrosoftConnectionMessage('Login cancelled or failed. Please try again to enable Microsoft integration features.');
          return;
        }
        return;
      }

      const account = accounts[0];
      setMicrosoftConnectionMessage(`Testing connection for ${account.username}...`);

      // Try to acquire token silently
      const tokenRequest = {
        scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
        account: account,
      };

      let tokenResponse;
      try {
        tokenResponse = await instance.acquireTokenSilent(tokenRequest);
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          // Token expired, try to acquire interactively
          tokenResponse = await instance.acquireTokenPopup(tokenRequest);
        } else {
          throw error;
        }
      }

      if (tokenResponse && tokenResponse.accessToken) {
        // Test Graph API call
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${tokenResponse.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setMicrosoftConnectionStatus('connected');
          setMicrosoftConnectionMessage(`✓ Connected successfully as ${userData.displayName} (${userData.mail})`);
        } else {
          throw new Error(`Graph API error: ${response.status}`);
        }
      } else {
        throw new Error('Failed to acquire access token');
      }
    } catch (error) {
      console.error('Microsoft connection test failed:', error);
      setMicrosoftConnectionStatus('error');
      setMicrosoftConnectionMessage(`✗ Connection failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-blue-600 text-4xl animate-spin mb-2" />
          <span className="text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (showUpdateModal) {
    return (
      <ProfilePictureModal
        currentImage={currentImage}
        onClose={() => setShowUpdateModal(false)}
        onSave={handleSaveImage}
        avatars={avatars}
        defaultIcon={defaultAvatar}
        uploading={uploading}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto ">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-blue-100 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-medium">Profile Settings</h1>
            <div className="w-8"></div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 flex flex-col items-center">
              <div className="relative group mb-4">
                <div className="relative h-48 w-48 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden shadow-inner">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FaUserCircle className="h-full w-full text-gray-300" />
                  )}
                  {/* Uploading overlay */}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                      <FaSpinner className="text-white text-3xl animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !uploading && setShowUpdateModal(true)}
                  disabled={uploading}
                  className={`absolute bottom-4 right-4 p-3 rounded-full shadow-md transition-all transform ${
                    uploading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-white text-blue-600 hover:text-blue-800 hover:bg-gray-50 hover:scale-105"
                  }`}
                  title={uploading ? "Uploading..." : "Edit profile picture"}
                >
                  <FaEdit className="text-lg" />
                </button>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  {userDetails?.name ||
                    profileData?.name ||
                    formatDisplayName(user.email)}
                </h2>
                <p className="text-gray-500 capitalize">
                  {userDetails?.role || "Role not specified"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Member since{" "}
                  {profileData?.createdAt
                    ? new Date(profileData.createdAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long" }
                      )
                    : new Date(user.metadata.creationTime).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long" }
                      )}
                </p>
              </div>
            </div>

            <div className="md:w-2/3">
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Full Name
                      </label>
                      <p className="text-gray-800">
                        {userDetails?.name ||
                          profileData?.name ||
                          formatDisplayName(user.email)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-800">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-100 pb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Work Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Role
                      </label>
                      <p className="text-gray-800 capitalize">
                        {userDetails?.role || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Department
                      </label>
                      <p className="text-gray-800 capitalize">
                        {userDetails?.department || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Reporting Manager
                      </label>
                      <p className="text-gray-800 capitalize">
                        {userDetails?.reportingManager || "Not assigned"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Account Created
                      </label>
                      <p className="text-gray-800">
                        {profileData?.createdAt
                          ? new Date(profileData.createdAt).toLocaleDateString(
                              "en-US",
                              { year: "numeric", month: "long", day: "numeric" }
                            )
                          : new Date(
                              user.metadata.creationTime
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Last Login
                      </label>
                      <p className="text-gray-800">
                        {lastLogin
                          ? lastLogin.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }) +
                            " at " +
                            lastLogin.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No login records found"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Microsoft Integration
                  </h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center border border-gray-200">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#0078D4"/>
                            <rect x="3" y="3" width="8" height="8" fill="#F25022"/>
                            <rect x="13" y="3" width="8" height="8" fill="#00A4EF"/>
                            <rect x="3" y="13" width="8" height="8" fill="#FFB900"/>
                            <rect x="13" y="13" width="8" height="8" fill="#7FBA00"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Microsoft 365</h4>
                          <p className="text-sm text-gray-600">Calendar & Office Integration</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        microsoftConnectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                        microsoftConnectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                        microsoftConnectionStatus === 'disconnected' ? 'bg-gray-100 text-gray-800' :
                        microsoftConnectionStatus === 'pending' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {microsoftConnectionStatus === 'connected' ? 'Connected' :
                         microsoftConnectionStatus === 'error' ? 'Error' :
                         microsoftConnectionStatus === 'disconnected' ? 'Disconnected' :
                         microsoftConnectionStatus === 'pending' ? 'Pending' :
                         'Checking...'}
                      </div>
                    </div>

                    <div className="mb-4">
                      <button
                        onClick={testMicrosoftConnection}
                        disabled={testingConnection}
                        className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          testingConnection
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                      >
                        {testingConnection ? (
                          <>
                            <FaSpinner className="animate-spin mr-3" />
                            {microsoftConnectionMessage.includes('Redirecting') ? 'Signing In...' : 'Testing Connection...'}
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {microsoftConnectionStatus === 'pending' ? 'Sign In with Microsoft' : 'Test Microsoft Connection'}
                          </>
                        )}
                      </button>
                    </div>

                    {microsoftConnectionMessage && (
                      <div className={`text-sm p-4 rounded-lg border ${
                        microsoftConnectionStatus === 'connected' ? 'bg-green-50 text-green-800 border-green-200' :
                        microsoftConnectionStatus === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                        microsoftConnectionStatus === 'pending' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        <div className="flex items-start">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                            microsoftConnectionStatus === 'connected' ? 'bg-green-500' :
                            microsoftConnectionStatus === 'error' ? 'bg-red-500' :
                            microsoftConnectionStatus === 'pending' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}>
                            {microsoftConnectionStatus === 'connected' ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : microsoftConnectionStatus === 'error' ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            ) : microsoftConnectionStatus === 'pending' ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {microsoftConnectionStatus === 'connected' ? 'Connection Successful' :
                               microsoftConnectionStatus === 'error' ? 'Connection Failed' :
                               microsoftConnectionStatus === 'pending' ? 'Action Required' :
                               'Connection Status'}
                            </p>
                            <p className="mt-1">{microsoftConnectionMessage}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <svg className="w-6 h-6 mx-auto mb-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs font-medium text-gray-700">Calendar Sync</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <svg className="w-6 h-6 mx-auto mb-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-medium text-gray-700">Follow-ups</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <svg className="w-6 h-6 mx-auto mb-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs font-medium text-gray-700">Office Apps</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
