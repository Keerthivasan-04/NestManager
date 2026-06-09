package com.nestmanager.security;

import com.nestmanager.model.User;
import com.nestmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * UserDetailsServiceImpl
 *
 * Implements Spring Security's UserDetailsService interface.
 * Spring Security calls loadUserByUsername() during authentication
 * to fetch the user from the database and verify the password.
 *
 * Our User entity already implements UserDetails (done in Section 2),
 * so we can return it directly without any wrapping.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads a user from the database by username.
     * Called by Spring Security during login.
     *
     * @param username  the username sent in the login request
     * @return          UserDetails (our User entity)
     * @throws UsernameNotFoundException if no user with that username exists
     */
    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with username: " + username
                ));
    }
}
