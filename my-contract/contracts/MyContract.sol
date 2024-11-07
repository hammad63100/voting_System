// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ElectionSystem {
    struct Candidate {
        address id;
        uint256 voteCount;
        string candidateName;
    }

    struct User {
        string name;
        string dateOfBirth;
        string parentName;
        string email;
        string mobileNo;
        string password;
        string cnicNumber;
        bool hasVoted;
        bool isLoggedIn;
    }

    // Events
    event UserRegistered(string cnicNumber, string name);
    event UserLoggedIn(string cnicNumber, string email);
    event UserLoggedOut(string cnicNumber);
    event Registered(address candidateId, uint256 candidateNum, string candidateName);
    event Voted(address voter, address candidate);

    // Mappings
    mapping(string => User) private usersByCnic;
    mapping(string => bool) private registeredCnic;
    mapping(string => bool) private registeredEmail;
    mapping(string => string) private emailToCnic; 
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    uint256 public candidatesCount;

    // Modifiers
    modifier onlyRegisteredUser(string memory _cnicNumber) {
        require(registeredCnic[_cnicNumber], "User is not registered");
        _;
    }

    modifier onlyLoggedInUser(string memory _cnicNumber) {
        require(usersByCnic[_cnicNumber].isLoggedIn, "User must be logged in");
        _;
    }

    // Constructor
    constructor() {}

    // User Registration and Authentication Functions
    function registerUser(
        string memory _name,
        string memory _dateOfBirth,
        string memory _parentName,
        string memory _email,
        string memory _mobileNo,
        string memory _password,
        string memory _cnicNumber
    ) public {
        require(!registeredCnic[_cnicNumber], "CNIC is already registered");
        require(!registeredEmail[_email], "Email is already registered");

        User memory newUser = User({
            name: _name,
            dateOfBirth: _dateOfBirth,
            parentName: _parentName,
            email: _email,
            mobileNo: _mobileNo,
            password: _password,
            cnicNumber: _cnicNumber,
            hasVoted: false,
            isLoggedIn: false
        });

        usersByCnic[_cnicNumber] = newUser;
        registeredCnic[_cnicNumber] = true;
        registeredEmail[_email] = true;
        emailToCnic[_email] = _cnicNumber;

        emit UserRegistered(_cnicNumber, _name);
    }

    function login(string memory _email, string memory _password) public returns (bool) {
        require(registeredEmail[_email], "Email is not registered");
        
        string memory userCnic = emailToCnic[_email];
        User storage user = usersByCnic[userCnic];
        
        require(keccak256(abi.encodePacked(user.password)) == 
                keccak256(abi.encodePacked(_password)), "Invalid password");
        
        user.isLoggedIn = true;
        emit UserLoggedIn(user.cnicNumber, _email);
        return true;
    }

    function logout(string memory _cnicNumber) public onlyRegisteredUser(_cnicNumber) {
        require(usersByCnic[_cnicNumber].isLoggedIn, "User is not logged in");
        usersByCnic[_cnicNumber].isLoggedIn = false;
        emit UserLoggedOut(_cnicNumber);
    }
    

    // Function to check login status
    function isUserLoggedIn(string memory _cnicNumber) public view returns (bool) {
        require(registeredCnic[_cnicNumber], "User is not registered");
        return usersByCnic[_cnicNumber].isLoggedIn;
    }

    // Function to get user details by CNIC
    function getUserDetails(string memory _cnicNumber) 
        public 
        view 
        onlyRegisteredUser(_cnicNumber) 
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory
        ) 
    {
        User memory user = usersByCnic[_cnicNumber];
        return (
            user.name,
            user.dateOfBirth,
            user.parentName,
            user.email,
            user.mobileNo
        );
    }

    // New function to get user details by email
    function getUserDetailsByEmail(string memory _email) 
        public 
        view 
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory
        ) 
    {
        require(registeredEmail[_email], "Email is not registered");
        string memory userCnic = emailToCnic[_email];
        User memory user = usersByCnic[userCnic];
        
        return (
            user.name,
            user.dateOfBirth,
            user.parentName,
            user.email,
            user.mobileNo
        );
    }

    // Voting System Functions
    function addCandidate(string memory _name) public {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(msg.sender, 0, _name);
        emit Registered(msg.sender, candidatesCount, _name);
    }

    function vote(string memory _candidateName) public {
        require(!hasVoted[msg.sender], "Already voted");

        uint256 candidateId = 0;

        for (uint256 i = 1; i <= candidatesCount; i++) {
            if (keccak256(abi.encodePacked(candidates[i].candidateName)) == keccak256(abi.encodePacked(_candidateName))) {
                candidateId = i;
                break;
            }
        }

        require(candidateId != 0, "Candidate not found");

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount++;

        emit Voted(msg.sender, candidates[candidateId].id);
    }

    function getResults() public view returns (Candidate memory winner) {
        require(candidatesCount > 0, "No candidates registered");
        
        uint256 maxVotes = 0;
        uint256 winningCandidate;

        for (uint256 i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winningCandidate = i;
            }
        }

        return candidates[winningCandidate];
    }

    // Helper Functions
    function hasUserVoted(string memory _cnicNumber) 
        public 
        view 
        onlyRegisteredUser(_cnicNumber) 
        returns (bool) 
    {
        return usersByCnic[_cnicNumber].hasVoted;
    }

    // Function to get candidate details
    function getCandidate(uint256 _candidateId) public view returns (
        address,
        uint256,
        string memory
    ) {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.id, candidate.voteCount, candidate.candidateName);
    }

    // Function to get total number of candidates
    function getTotalCandidates() public view returns (uint256) {
        return candidatesCount;
    }
}
