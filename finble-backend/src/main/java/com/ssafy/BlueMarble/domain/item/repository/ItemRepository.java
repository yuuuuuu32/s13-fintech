package com.ssafy.BlueMarble.domain.item.repository;

import com.ssafy.BlueMarble.domain.item.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long> {

    Optional<Item> findById(Long id);


}
